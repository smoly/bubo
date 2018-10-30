import _ from 'lodash';
import React, { Component, ReactNode, RefObject } from 'react';
import {
  Animated, Dimensions, FlatList, GestureResponderEvent, Image, ImageStyle, LayoutChangeEvent, Modal, Platform,
  ScrollView, SectionList, SectionListData, SectionListStatic, Text, TextInput, TextStyle, TouchableHighlight, View,
  ViewStyle, WebView,
} from 'react-native';
import ActionSheet from 'react-native-actionsheet'; // [Must `import ActionSheet` i/o `import { ActionSheet }`, else barf]
import FastImage from 'react-native-fast-image';
import * as Gesture from 'react-native-gesture-handler';
import {
  BaseButton, BorderlessButton, LongPressGestureHandler, PanGestureHandler, PinchGestureHandler, RectButton,
  TapGestureHandler,
  // FlatList, ScrollView, Slider, Switch, TextInput, // TODO Needed?
} from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import SQLite from 'react-native-sqlite-storage';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { iOSColors, material, materialColors, systemWeights } from 'react-native-typography'
import { IconProps } from 'react-native-vector-icons/Icon';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import RNFB from 'rn-fetch-blob';
import { sprintf } from 'sprintf-js';
const fs = RNFB.fs;

import { ActionSheetBasic } from './ActionSheets';
import { Settings, ShowMetadata } from './Settings';
import { config } from '../config';
import { Quality, Rec, RecId, SearchRecs } from '../datatypes';
import { log, puts, tap } from '../log';
import Sound from '../sound';
import { querySql } from '../sql';
import { StyleSheet } from '../stylesheet';
import {
  chance, Clamp, Dim, finallyAsync, getOrSet, global, json, match, Point, setStateAsync, Styles, TabBarBottomConstants,
} from '../utils';

const sidewaysTextWidth = 14;

type State = {
  sectionListKey: string;
  sectionListContentOffset: Point;
  spectroScaleY: number; // XXX Moved from Settings to simplify local/global setState interactions (unbatched update)
  showFilters: boolean;
  showHelp: boolean;
  totalRecs?: number;
  queryText: string;
  query?: string;
  queryConfig: {
    quality: Array<Quality>,
    limit: number,
  };
  status: string;
  recs: Array<Rec>;
  playing?: {
    rec: Rec,
    sound: Sound,
    startTime?: number,
  };
};

type Props = {
  spectroBase:        Dim<number>;
  spectroScaleYClamp: Clamp<number>;
};

export class SearchScreen extends Component<Props, State> {

  static defaultProps = {
    spectroBase:        {height: 20, width: Dimensions.get('window').width},
    spectroScaleYClamp: {min: 1, max: 8},
  };

  db?: SQLiteDatabase;
  soundsCache: Map<RecId, Promise<Sound> | Sound> = new Map();

  saveActionSheet: RefObject<ActionSheet> = React.createRef();
  addActionSheet:  RefObject<ActionSheet> = React.createRef();
  sortActionSheet: RefObject<ActionSheet> = React.createRef();

  _sectionListContentOffset: Point = {x: 0, y: 0};

  sectionListRef: RefObject<SectionListStatic<Rec>> = React.createRef();

  constructor(props: Props) {
    super(props);

    this.state = {
      sectionListKey: '',
      sectionListContentOffset: this._sectionListContentOffset,
      spectroScaleY: 2,
      showFilters: false,
      showHelp: false,
      queryText: '',
      queryConfig: { // TODO Move to (global) SettingsScreen.state
        quality: ['A', 'B'],
        limit: 100,
      },
      status: '',
      recs: [],
    };

    global.SearchScreen = this; // XXX Debug
  }

  componentDidMount = async () => {
    log.debug('SearchScreen.componentDidMount');

    // Configure react-native-sound
    //  - TODO Experiment to figure out which "playback mode" and "audio session mode" we want
    //  - https://github.com/zmxv/react-native-sound/wiki/API#soundsetcategoryvalue-mixwithothers-ios-only
    //  - https://apple.co/2q2osEd
    //  - https://developer.apple.com/documentation/avfoundation/avaudiosession/audio_session_modes
    //  - https://apple.co/2R22tcg
    Sound.setCategory(
      'Playback', // Enable playback in silence mode [cargo-culted from README]
      true,       // mixWithOthers
    );
    Sound.setMode(
      'Default', // "The default audio session mode"
    );

    // Tell other apps we're using the audio device
    Sound.setActive(true);

    // Open db conn
    const dbFilename = SearchRecs.dbPath;
    const dbExists = await fs.exists(`${fs.dirs.MainBundleDir}/${dbFilename}`);
    if (!dbExists) {
      log.error(`DB file not found: ${dbFilename}`);
    } else {
      const dbLocation = `~/${dbFilename}`; // Relative to app bundle (copied into the bundle root by react-native-asset)
      this.db = await SQLite.openDatabase({
        name: dbFilename,               // Just for SQLite bookkeeping, I think
        readOnly: true,                 // Else it will copy the (huge!) db file from the app bundle to the documents dir
        createFromLocation: dbLocation, // Else readOnly will silently not work
      });
    }

    // Query db size (once, up front)
    await querySql<{totalRecs: number}>(this.db!, `
      select count(*) as totalRecs
      from search_recs
    `)(async results => {
      const [{totalRecs}] = results.rows.raw();
      await setStateAsync(this, {
        totalRecs,
      });
    });

    // XXX Faster dev
    await this.editQueryText('GREG,LASP,HOFI,NOFL,GTGR,SWTH,GHOW');
    this.submitQuery();

  }

  componentWillUnmount = async () => {
    log.debug('SearchScreen.componentWillUnmount');

    // Tell other apps we're no longer using the audio device
    Sound.setActive(false);

    // Release cached sound resources
    await this.releaseSounds();

  }

  editQueryText = async (queryText: string) => {
    await setStateAsync(this, {
      queryText,
    });
  }

  submitQuery = async () => {
    let {queryText, query} = this.state;
    if (queryText && queryText !== query) {
      query = queryText;

      // Record query + clear previous results
      await this.releaseSounds();
      await setStateAsync(this, {
        query,
        recs: [],
        status: '[Loading...]',
      });

      // Can't use window functions until sqlite ≥3.25.x
      //  - TODO Waiting on: https://github.com/litehelpers/Cordova-sqlite-storage/issues/828

      log.debug('query', query);
      await querySql<Rec>(this.db!, `
        select *
        from (
          select
            *,
            cast(taxon_order as real) as taxon_order_num
          from search_recs
          where
            species in (?) and
            quality in (?)
          order by
            xc_id desc
          limit ?
        )
        order by
          taxon_order_num asc,
          xc_id desc
      `, [
        query.split(',').map(x => _.trim(x).toUpperCase()),
        this.state.queryConfig.quality,
        this.state.queryConfig.limit,
      ])(async results => {
        const recs = results.rows.raw();
        await setStateAsync(this, {
          recs,
          status: `${recs.length} recs`,
        });
      });

    }
  }

  releaseSounds = async () => {
    log.info('Releasing cached sounds');
    await Promise.all(
      Array.from(this.soundsCache).map(async ([recId, soundAsync]) => {
        log.info('Releasing sound',
          // recId, // Noisy
        );
        (await soundAsync).release();
      }),
    );
    this.soundsCache = new Map();
  }

  getOrAllocateSoundAsync = async (rec: Rec): Promise<Sound> => {
    // Is sound already allocated (in the cache)?
    let soundAsync = this.soundsCache.get(rec.id);
    if (!soundAsync) {
      log.debug('Allocating sound',
        // rec.id, // Noisy
      );
      // Allocate + cache sound resource
      //  - Cache the promise so that get+set is atomic, else we race and allocate multiple sounds per rec.id
      //  - (Observable via log counts in the console: if num alloc > num release, then we're racing)
      this.soundsCache.set(rec.id, Sound.newAsync(
        Rec.audioPath(rec),
        Sound.MAIN_BUNDLE,
      ));
      soundAsync = this.soundsCache.get(rec.id);
    }
    return await soundAsync!;
  }

  toggleRecPlaying = (settings: Settings, rec: Rec) => {

    // Eagerly allocate Sound resource for rec
    //  - TODO How eagerly should we cache this? What are the cpu/mem costs and tradeoffs?
    const soundAsync = this.getOrAllocateSoundAsync(rec);

    return async (event: Gesture.TapGestureHandlerStateChangeEvent) => {
      const {nativeEvent: {state, oldState, x}} = event; // Unpack SyntheticEvent (before async)
      if (
        // [Mimic Gesture.BaseButton]
        oldState === Gesture.State.ACTIVE &&
        state !== Gesture.State.CANCELLED
      ) {
        log.debug('toggleRecPlaying', `x[${x}]`);
        log.debug('rec', rec);
        log.debug('this.state.playing', this.state.playing);

        // FIXME Races? Tap a lot of spectros really quickly and watch the "Playing rec" logs pile up

        const {playing} = this.state;

        // Stop any recs that are currently playing
        if (playing) {
          const {rec, sound, startTime} = playing;

          // Stop sound playback
          log.debug('Stopping playing rec', rec.id);
          await setStateAsync(this, {
            playing: undefined,
          });
          await sound.stopAsync();

          global.sound = sound; // XXX Debug

        }

        // If touched rec was the currently playing rec, then we're done (it's stopped)
        // Else, play the (new) touched rec
        //  - HACK Override if seekOnPlay, so we can tap with abandon
        if (!this.recIsPlaying(rec.id, playing) || settings.seekOnPlay) {

          const sound = await soundAsync;

          global.sound = sound; // XXX Debug

          // Seek rec (if enabled)
          let startTime;
          if (settings.seekOnPlay) {
            startTime = this.spectroTimeFromX(settings, sound, x);
            sound.setCurrentTime(startTime);
          }

          // Play rec
          log.debug('Playing rec', rec.id);
          await setStateAsync(this, {
            playing: {rec, sound, startTime},
          });
          finallyAsync(sound.playAsync(), async () => {
            // Promise fulfills after playback completes / is stopped / fails
            log.debug('Done playing rec', rec.id);
            await setStateAsync(this, {
              playing: undefined,
            });
          });

        }

        // log.debug('toggleRecPlaying: done');
      }
    };
  }

  spectroTimeFromX = (settings: Settings, sound: Sound, x: number): number => {
    const width = Dimensions.get('window').width; // TODO TODO Unmock
    return (x / width) * sound.getDuration();
  }

  spectroXFromTime = (settings: Settings, sound: Sound, time: number): number => {
    return time / sound.getDuration() * this.spectroDimensions(settings).width;
  }

  recIsPlaying = (recId: RecId, playing: undefined | {rec: Rec}): boolean => {
    return !playing ? false : playing.rec.id === recId;
  }

  spectroDimensions = (settings: Settings): Dim<number> => {
    return {
      width: _.sum([
        this.props.spectroBase.width * this.state.spectroScaleY,
        // this.props.spectroBase.width,
        settings.showMetadata === 'none' ? -sidewaysTextWidth : 0,
      ]),
      height: this.props.spectroBase.height * this.state.spectroScaleY,
    };
  }

  onLongPress = (rec: Rec) => async (event: Gesture.LongPressGestureHandlerStateChangeEvent) => {
    const {nativeEvent: {state}} = event; // Unpack SyntheticEvent (before async)
    if (state === Gesture.State.ACTIVE) {
      log.debug('onLongPress');
    }
  }

  onBottomControlsLongPress = async (event: Gesture.LongPressGestureHandlerStateChangeEvent) => {
    const {nativeEvent: {state}} = event; // Unpack SyntheticEvent (before async)
    await match(state,
      [Gesture.State.ACTIVE, async () => await setStateAsync(this, {showHelp: true})],
      [Gesture.State.END,    async () => await setStateAsync(this, {showHelp: false})],
    )();
  }

  onMockPress = (rec: Rec) => async () => {
    console.log('renderLeftAction.onMockPress');
  }

  Filters = () => (
    <View style={[
      styles.filtersModal,
      {marginBottom: TabBarBottomConstants.DEFAULT_HEIGHT},
    ]}>
      <Text>Filters</Text>
      <Text>- quality</Text>
      <Text>- month</Text>
      <Text>- species likelihood [bucketed ebird priors]</Text>
      <Text>- rec text search [conflate fields]</Text>
      {/* XXX For reference
      <TextInput
        style={styles.queryInput}
        value={this.state.queryText}
        onChangeText={this.editQueryText}
        onSubmitEditing={this.submitQuery}
        autoCorrect={false}
        autoCapitalize='characters'
        enablesReturnKeyAutomatically={true}
        placeholder='Species'
        returnKeyType='search'
      />
      */}
      <RectButton onPress={async () => await setStateAsync(this, {showFilters: false})}>
        <View style={{padding: 10, backgroundColor: iOSColors.blue}}>
          <Text>Done</Text>
        </View>
      </RectButton>
    </View>
  );

  cycleMetadata = async (settings: Settings) => {
    const next = (showMetadata: ShowMetadata) => match<ShowMetadata, ShowMetadata, ShowMetadata>(showMetadata,
      ['none',    'oneline'],
      ['oneline', 'full'],
      ['full',    'none'],
    );
    await settings.set('showMetadata', next(settings.showMetadata));

    // Scroll SectionList so that same ~top recs are showing after drawing with new item/section heights
    //  - TODO More experimentation needed
    // requestAnimationFrame(() => {
    //   if (this.sectionListRef.current) {
    //     this.sectionListRef.current.scrollToLocation({
    //       animated: false,
    //       sectionIndex: 3, itemIndex: 3, // TODO Calculate real values to restore
    //       viewPosition: 0, // 0: top, .5: middle, 1: bottom
    //     });
    //   }
    // });

  }

  scaleSpectrosStep = async (step: number) => {
    // Round so that +/- steps snap to non-fractional scales
    await setStateAsync(this, (state, props) => {
      const spectroScaleY = this.clampSpectroScaleY(Math.round(state.spectroScaleY) + step);
      return {
        spectroScaleY,
        // TODO Close, but params need more tweaking
        sectionListContentOffset: {
          x: this._sectionListContentOffset.x * spectroScaleY / state.spectroScaleY,
          y: this._sectionListContentOffset.y * spectroScaleY / state.spectroScaleY,
        },
      };
    });
  }

  clampSpectroScaleY = (spectroScaleY: number): number => _.clamp(
    spectroScaleY,
    this.props.spectroScaleYClamp.min,
    this.props.spectroScaleYClamp.max,
  );

  BottomControls = (props: {}) => (
    <Settings.Context.Consumer children={settings => (
      <View style={styles.bottomControls}>
        {/* Filters */}
        <this.BottomControlsButton
          help='Filters'
          onPress={async () => await setStateAsync(this, {showFilters: true})}
          iconProps={{name: 'filter'}}
        />
        {/* Save as new list / add all to saved list / share list */}
        <this.BottomControlsButton
          help='Save'
          onPress={() => this.saveActionSheet.current!.show()}
          iconProps={{name: 'star'}}
          // iconProps={{name: 'share'}}
        />
        {/* Add species (select species manually) */}
        <this.BottomControlsButton
          help='Add'
          onPress={() => this.addActionSheet.current!.show()}
          // iconProps={{name: 'user-plus'}}
          // iconProps={{name: 'file-plus'}}
          // iconProps={{name: 'folder-plus'}}
          iconProps={{name: 'plus-circle'}}
          // iconProps={{name: 'plus'}}
        />
        {/* Toggle sort: species probs / rec dist / manual list */}
        <this.BottomControlsButton
          help='Sort'
          onPress={() => this.sortActionSheet.current!.show()}
          // iconProps={{name: 'chevrons-down'}}
          // iconProps={{name: 'chevron-down'}}
          iconProps={{name: 'arrow-down'}}
          // iconProps={{name: 'arrow-down-circle'}}
        />
        {/* Cycle metadata: none / oneline / full */}
        <this.BottomControlsButton
          help='Info'
          onPress={() => this.cycleMetadata(settings)}
          iconProps={{name: 'file-text'}}
          // iconProps={{name: 'credit-card', style: Styles.flipVertical}}
          // iconProps={{name: 'sidebar', style: Styles.rotate270}}
        />
        {/* Toggle editing controls for rec/species */}
        <this.BottomControlsButton
          help='Edit'
          onPress={() => settings.toggle('editing')}
          active={settings.editing}
          iconProps={{name: 'sliders'}}
          // iconProps={{name: 'edit'}}
          // iconProps={{name: 'edit-2'}}
          // iconProps={{name: 'edit-3'}}
          // iconProps={{name: 'layout', style: Styles.flipBoth}}
        />
        {/* [Toggle play/pause crosshairs] */}
        <this.BottomControlsButton
          help='Seek'
          onPress={() => settings.toggle('seekOnPlay')}
          active={settings.seekOnPlay}
          iconProps={{name: 'crosshair'}}
        />
        {/* Zoom more/fewer recs (spectro height) */}
        {/* - TODO Disable when spectroScaleY is min/max */}
        <this.BottomControlsButton
          help='Dense'
          disabled={this.state.spectroScaleY === this.props.spectroScaleYClamp.min}
          onPress={async () => await this.scaleSpectrosStep(-1)}
          iconProps={{name: 'align-justify'}} // 4 horizontal lines
        />
        <this.BottomControlsButton
          help='Tall'
          disabled={this.state.spectroScaleY === this.props.spectroScaleYClamp.max}
          onPress={async () => await this.scaleSpectrosStep(+1)}
          iconProps={{name: 'menu'}}          // 3 horizontal lines
        />
      </View>
    )}/>
  );

  BottomControlsButton = (props: {
    help: string,
    iconProps: IconProps,
    onPress?: (pointerInside: boolean) => void,
    active?: boolean,
    disabled?: boolean,
  }) => {
    const {style: iconStyle, ...iconProps} = props.iconProps;
    return (
      <LongPressGestureHandler onHandlerStateChange={this.onBottomControlsLongPress}>
        <BorderlessButton
          style={styles.bottomControlsButton}
          onPress={props.disabled ? undefined : props.onPress}
        >
          {this.state.showHelp && (
            <Text style={styles.bottomControlsButtonHelp}>{props.help}</Text>
          )}
          <Feather
            style={[
              styles.bottomControlsButtonIcon,
              iconStyle,
              (
                props.disabled ? {color: iOSColors.gray} :
                props.active   ? {color: iOSColors.blue} :
                {}
              ),
            ]}
            {...iconProps}
          />
        </BorderlessButton>
      </LongPressGestureHandler>
    );
  }

  sectionsForRecs = (recs: Array<Rec>): Array<SectionListData<Rec>> => {
    const sections = [];
    let section;
    for (let rec of recs) {
      const title = rec.species;
      if (!section || title !== section.title) {
        if (section) sections.push(section);
        section = {
          title,
          data: [] as Rec[],
          species: rec.species,
          species_taxon_order: rec.species_taxon_order,
          species_com_name: rec.species_com_name,
          species_sci_name: rec.species_sci_name,
          recs_for_sp: rec.recs_for_sp,
        };
      }
      section.data.push(rec);
    }
    if (section) sections.push(section);
    return sections;
  }

  SpeciesEditingButtons = () => (
    <View style={styles.sectionSpeciesEditingView}>
      <BorderlessButton style={styles.sectionSpeciesEditingButton} onPress={() => {}}>
        <Feather style={styles.sectionSpeciesEditingIcon} name='move' />
      </BorderlessButton>
      <BorderlessButton style={styles.sectionSpeciesEditingButton} onPress={() => {}}>
        <Feather style={styles.sectionSpeciesEditingIcon} name='search' />
      </BorderlessButton>
      <BorderlessButton style={styles.sectionSpeciesEditingButton} onPress={() => {}}>
        <Feather style={styles.sectionSpeciesEditingIcon} name='user-x' />
      </BorderlessButton>
      <BorderlessButton style={styles.sectionSpeciesEditingButton} onPress={() => {}}>
        <Feather style={styles.sectionSpeciesEditingIcon} name='plus-circle' />
      </BorderlessButton>
    </View>
  );

  RecEditingButtons = () => (
    <View style={styles.recEditingView}>
      <BorderlessButton style={styles.recEditingButton} onPress={() => {}}>
        <Feather style={styles.recEditingIcon} name='move' />
      </BorderlessButton>
      <BorderlessButton style={styles.recEditingButton} onPress={() => {}}>
        <Feather style={styles.recEditingIcon} name='search' />
      </BorderlessButton>
      <BorderlessButton style={styles.recEditingButton} onPress={() => {}}>
        <Feather style={styles.recEditingIcon} name='x' />
      </BorderlessButton>
      <BorderlessButton style={styles.recEditingButton} onPress={() => {}}>
        <Feather style={styles.recEditingIcon} name='star' />
      </BorderlessButton>
    </View>
  );

  RecText = <X extends {children: any, flex?: number}>(props: X) => {
    const flex = props.flex || 1;
    return (<Text
      style={[styles.recText, {flex}]}
      numberOfLines={1}
      ellipsizeMode='tail'
      {...props}
    />);
  }

  ModalsAndActionSheets = () => (
    <View>
      <Modal
        visible={this.state.showFilters}
        animationType='none' // 'none' | 'slide' | 'fade'
        transparent={true}
        children={this.Filters()}
      />
      <ActionSheetBasic
        innerRef={this.saveActionSheet}
        options={[
          ['Save as new list',      () => {}],
          ['Add all to saved list', () => {}],
          ['Share list',            () => {}],
        ]}
      />
      <ActionSheetBasic
        innerRef={this.addActionSheet}
        options={[
          ['Add a species manually', () => {}],
          ['+ num species',          () => {}],
          ['– num species',          () => {}],
          ['+ num recs per species', () => {}],
          ['– num recs per species', () => {}],
        ]}
      />
      <ActionSheetBasic
        innerRef={this.sortActionSheet}
        options={
          // this.state.queryRec ? [ // TODO queryRec
          true ? [
            ['Sort by species, then by recs', () => {}],
            ['Sort by recs only',             () => {}],
            ['Order manually',                () => {}],
          ] : [
            ['Sort recs by similarity',       () => {}],
            ['Order manually',                () => {}],
          ]
        }
      />
    </View>
  );

  render = () => (
    <Settings.Context.Consumer children={settings => (
      <View style={styles.container}>

        {/* Recs list (with pan/pinch) */}
        <SectionList
          // @ts-ignore [Why doesn't this typecheck?]
          ref={this.sectionListRef as RefObject<Component<SectionListStatic<Rec>, any, any>>}
          style={styles.recList}

          // Scroll/zoom
          //  - Force re-layout on zoom change, else bad things (that I don't understand)
          key={this.state.sectionListKey}
          //  - Expand container width else we can't scroll horizontally
          contentContainerStyle={{
            width: this.props.spectroBase.width * this.state.spectroScaleY,
          }}
          contentOffset={this.state.sectionListContentOffset}
          bounces={false}
          bouncesZoom={false}
          minimumZoomScale={this.props.spectroScaleYClamp.min / this.state.spectroScaleY}
          maximumZoomScale={this.props.spectroScaleYClamp.max / this.state.spectroScaleY}
          onMomentumScrollEnd={({nativeEvent: {contentOffset}}) => {
            log.info('onMomentumScrollEnd', json({contentOffset}));
            this._sectionListContentOffset = contentOffset;
          }}
          onScrollEndDrag={async ({nativeEvent: {contentOffset, zoomScale, velocity}}) => {
            log.info('onScrollEndDrag', json({contentOffset}));
            this._sectionListContentOffset = contentOffset;
            if (
              zoomScale !== 1
              // && velocity !== undefined // [XXX bad] This seems to distinguish 2/2 vs. 1/2 fingers released (want 2/2)
            ) {
              const scale = zoomScale * this.state.spectroScaleY;
              log.info('ZOOM', json({contentOffset, spectroScaleY: this.state.spectroScaleY, zoomScale, scale}));
              // Trigger re-layout so non-image components (e.g. text) redraw at non-zoomed size
              //  - TODO Close, but params need more tweaking
              await setStateAsync(this, {
                spectroScaleY: this.clampSpectroScaleY(scale),
                sectionListContentOffset: this._sectionListContentOffset,
                sectionListKey: chance.hash(), // Else bad things (that I don't understand)
              });
            }
          }}

          // SectionList data
          sections={this.sectionsForRecs(this.state.recs)}
          keyExtractor={(rec, index) => rec.id.toString()}
          initialNumToRender={20} // TODO Compute from zoom * spectro height
          renderSectionHeader={({section: {species_com_name, species_sci_name, recs_for_sp}}) => (
            // Species header
            settings.showMetadata === 'none' ? null : (
              <View style={styles.sectionSpecies}>
                {/* Species editing buttons */}
                {!settings.editing ? null : (
                  <this.SpeciesEditingButtons />
                )}
                {/* Species name */}
                <Text numberOfLines={1} style={styles.sectionSpeciesText}>
                  {species_com_name}
                </Text>
                {/* Debug info */}
                {settings.showDebug && (
                  <Text numberOfLines={1} style={[{marginLeft: 'auto', alignSelf: 'center'}, settings.debugText]}>
                    ({recs_for_sp} recs)
                  </Text>
                )}
              </View>
            )
          )}
          renderItem={({item: rec, index}) => (
            // Rec row
            <Animated.View style={styles.recRow}>

              {/* Rec editing buttons */}
              {/* - TODO Flex image width so we can show these on the right (as is, they'd be pushed off screen) */}
              {!settings.editing ? null : (
                <this.RecEditingButtons />
              )}

              {/* Rec region without the editing buttons  */}
              <Animated.View style={[styles.recRowInner,
                // HACK Visual feedback for playing rec (kill after adding scrolling bar)
                (!this.recIsPlaying(rec.id, this.state.playing)
                  ? {borderColor: iOSColors.gray}
                  : {borderColor: iOSColors.red, borderTopWidth: 1}
                ),
              ]}>

                {/* Tap rec */}
                <LongPressGestureHandler onHandlerStateChange={this.onLongPress(rec)}>
                  {/* <TapGestureHandler onHandlerStateChange={this.toggleRecPlaying(settings, rec)}> */}
                    <Animated.View style={{flexDirection: 'row'}} collapsable={false}>

                      {/* Sideways species label (sometimes) */}
                      {settings.showMetadata !== 'none' ? null : (
                        <View style={styles.recSpeciesSidewaysView}>
                          <View style={styles.recSpeciesSidewaysViewInner}>
                            <Text numberOfLines={1} style={[styles.recSpeciesSidewaysText, {
                              fontSize: this.state.spectroScaleY < 2 ? 6 : 11, // Compact species label to fit within tiny rows
                            }]}>
                              {rec.species}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Spectro */}
                      <View style={{flex: 1}}>

                        {/* Image */}
                        <Animated.Image
                          style={this.spectroDimensions(settings)}
                          resizeMode='stretch'
                          source={{uri: Rec.spectroPath(rec)}}
                        />

                        {/* Current time cursor (if playing + startTime) */}
                        {this.recIsPlaying(rec.id, this.state.playing) && (
                          this.state.playing!.startTime && (
                            <View style={{
                              position: 'absolute',
                              left: this.spectroXFromTime(
                                settings,
                                this.state.playing!.sound,
                                this.state.playing!.startTime!,
                              ),
                              width: 1,
                              height: '100%',
                              backgroundColor: 'black',
                            }}/>
                          )
                        )}

                      </View>

                    </Animated.View>
                  {/* </TapGestureHandler> */}
                </LongPressGestureHandler>

                {/* Rec metadata */}
                {match(settings.showMetadata,
                  ['none', null],
                  ['oneline', (
                    <View style={styles.recMetadataOneline}>
                      <this.RecText flex={3} children={rec.xc_id} />
                      <this.RecText flex={1} children={rec.quality} />
                      <this.RecText flex={2} children={rec.month_day} />
                      <this.RecText flex={4} children={Rec.placeNorm(rec)} />
                      {ccIcon({style: styles.recTextFont})}
                      <this.RecText flex={4} children={` ${rec.recordist}`} />
                    </View>
                  )],
                  ['full', (
                    <View style={styles.recMetadataFull}>
                      <this.RecText flex={3} children={rec.xc_id} />
                      <this.RecText flex={1} children={rec.quality} />
                      <this.RecText flex={2} children={rec.month_day} />
                      <this.RecText flex={4} children={Rec.placeNorm(rec)} />
                      {ccIcon({style: styles.recTextFont})}
                      <this.RecText flex={4} children={` ${rec.recordist}`} />
                    </View>
                  )],
                )}

              </Animated.View>

            </Animated.View>
          )}

        />

        {/* Debug info */}
        <View style={settings.debugView}>
          <Text style={settings.debugText}>Status: {this.state.status} ({this.state.totalRecs || '?'} total)</Text>
          <Text style={settings.debugText}>Filters: {JSON.stringify(this.state.queryConfig)}</Text>
        </View>

        {/* Bottom controls */}
        <this.BottomControls/>

        {/* Modals + action sheets */}
        <this.ModalsAndActionSheets/>

      </View>
    )}/>
  );

}

function ccIcon(props?: object): Element {
  const [icon] = licenseTypeIcons('cc', props);
  return icon;
}

function licenseTypeIcons(license_type: string, props?: object): Array<Element> {
  license_type = `cc-${license_type}`;
  return license_type.split('-').map(k => (<FontAwesome5
    key={k}
    name={k === 'cc' ? 'creative-commons' : `creative-commons-${k}`}
    {...props}
  />));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersModal: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 300,
    backgroundColor: iOSColors.green,
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    backgroundColor: iOSColors.midGray,
  },
  bottomControlsButton: {
    flex: 1,
    alignItems: 'center',
  },
  bottomControlsButtonHelp: {
    ...material.captionObject,
  },
  bottomControlsButtonIcon: {
    ...material.headlineObject,
  },
  queryInput: {
    borderWidth: 1, borderColor: 'gray',
    ...material.display1Object,
  },
  summaryText: {
    ...material.captionObject,
  },
  recList: {
    // borderWidth: 1, borderColor: 'gray',
  },
  sectionSpecies: {
    flexDirection: 'row',
    // ...material.body1Object, backgroundColor: iOSColors.customGray, // Black on white
    ...material.body1WhiteObject, backgroundColor: iOSColors.gray, // White on black
  },
  sectionSpeciesText: {
    alignSelf: 'center', // Align text vertically
  },
  sectionSpeciesEditingView: {
    flexDirection: 'row',
    zIndex: 1, // Over spectro image
  },
  sectionSpeciesEditingButton: {
    width: 35, // Need explicit width (i/o flex:1) else view shows with width:0
    justifyContent: 'center', // Align icon vertically
    backgroundColor: iOSColors.gray,
  },
  sectionSpeciesEditingIcon: {
    ...material.headlineObject,
    alignSelf: 'center', // Align icon horizontally
  },
  recRow: {
    flex: 1, flexDirection: 'row',
  },
  recRowInner: {
    flex: 1, flexDirection: 'column',
    borderBottomWidth: 1,
    // borderColor: 'gray', // Set dynamically
  },
  recSpeciesSidewaysView: {
    backgroundColor: iOSColors.gray, // TODO Map rec.species -> color
    justifyContent: 'center',        // Else sideways text is to the above
    alignItems: 'center',            // Else sideways text is to the right
    width: sidewaysTextWidth,        // HACK Manually shrink outer view width to match height of sideways text
    zIndex: 1,                       // Over spectro image
  },
  recSpeciesSidewaysViewInner: {     // View>View>Text else the text aligment doesn't work
    transform: [{rotate: '270deg'}], // Rotate text sideways
    width: 100,                      // Else text is clipped to outer view's (smaller) width
    // borderWidth: 1, borderColor: 'black', // XXX Debug
  },
  recSpeciesSidewaysText: {
    alignSelf: 'center',             // Else sideways text is to the bottom
    // fontSize: ...,                // Set dynamically
    // ...material.captionObject,    // (Sticking with default color:'black')
  },
  recMetadataOneline: {
    flex: 2, flexDirection: 'row', // TODO Eh...
  },
  recMetadataFull: {
    flex: 1,
    flexDirection: 'column',
  },
  recText: {
    ...material.captionObject,
  },
  recTextFont: {
    ...material.captionObject,
  },
  recSpectro: {
  },
  recEditingView: {
    flexDirection: 'row',
    zIndex: 1, // Over spectro image
  },
  recEditingButton: {
    width: 35, // Need explicit width (i/o flex:1) else view shows with width:0
    justifyContent: 'center', // Align icon vertically
    backgroundColor: iOSColors.midGray,
  },
  recEditingIcon: {
    // ...material.titleObject,
    ...material.headlineObject,
    alignSelf: 'center', // Align icon horizontally
  },
  swipeButtons: {
    flexDirection: 'row',
  },
  swipeButton: {
    flex: 1,
    alignItems: 'center',
  },
  swipeButtonText: {
  },
});
