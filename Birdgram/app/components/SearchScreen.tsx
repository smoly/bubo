import * as d3sc from 'd3-scale-chromatic';
import { Location, MemoryHistory } from 'history';
import _ from 'lodash';
import React, { Component, PureComponent, ReactNode, RefObject } from 'react';
import RN, {
  ActivityIndicator, Animated, Dimensions, FlatList, FlexStyle, GestureResponderEvent, Image, ImageStyle, Keyboard,
  KeyboardAvoidingView, LayoutChangeEvent, Modal, Platform, RegisteredStyle, ScrollView, SectionList, SectionListData,
  SectionListStatic, StyleProp, Text, TextInput, TextStyle, TouchableHighlight, View, ViewStyle, WebView,
} from 'react-native';
import ActionSheet from 'react-native-actionsheet'; // [Must `import ActionSheet` i/o `import { ActionSheet }`, else barf]
import FastImage from 'react-native-fast-image';
import * as Gesture from 'react-native-gesture-handler';
import {
  BaseButton, BorderlessButton, BorderlessButtonProperties, LongPressGestureHandler, PanGestureHandler,
  PinchGestureHandler, RectButton, TapGestureHandler,
  // FlatList, ScrollView, Slider, Switch, TextInput, // TODO Needed?
} from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import SQLite from 'react-native-sqlite-storage';
import { SQLiteDatabase } from 'react-native-sqlite-storage';
import { iOSColors, material, materialColors, systemWeights } from 'react-native-typography'
import { IconProps } from 'react-native-vector-icons/Icon';
import timer from 'react-native-timer';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Link, matchPath, Redirect, Route, Switch } from 'react-router-native';
import RNFB from 'rn-fetch-blob';
import { sprintf } from 'sprintf-js';
import stringHash from "string-hash";
const fs = RNFB.fs;

import { ActionSheetBasic } from './ActionSheets';
import {
  MetadataColumnBelow, MetadataColumnsBelow, MetadataColumnLeft, MetadataColumnsLeft, MetadataText,
} from './MetadataColumns';
import { CCIcon, LicenseTypeIcons } from './Misc';
import { TabBarStyle } from './TabRoutes';
import { config } from '../config';
import {
  ModelsSearch, matchSearchPathParams, Quality, Rec, rec_f_preds, Rec_f_preds, SearchPathParams,
  searchPathParamsFromPath, SearchRecs, ServerConfig, showSourceId, SourceId,
} from '../datatypes';
import { log, puts, tap } from '../log';
import { Go } from '../router';
import { SettingsWrites } from '../settings';
import Sound from '../sound';
import { queryPlanFromRows, queryPlanPretty, querySql, SQL, sqlf } from '../sql';
import { StyleSheet } from '../stylesheet';
import { LabelStyle, labelStyles, Styles } from '../styles';
import {
  all, any, chance, Clamp, deepEqual, Dim, finallyAsync, getOrSet, global, json, mapMapValues, match, noawait,
  objectKeysTyped, Omit, Point, pretty, round, shallowDiffPropsState, Style, Timer, yaml, yamlPretty, zipSame,
} from '../utils';

const sidewaysTextWidth = 14;
const recEditingButtonWidth = 30;

interface ScrollViewState {
  contentOffset: Point;
  // (More fields available in NativeScrollEvent)
}

// QUESTION Should Query + SearchPathParams be separate? 1-1 so far...
type Query = QueryNone | QueryRandom | QuerySpecies | QueryRec;
type QueryNone    = {kind: 'none'}; // e.g. so we can show nothing on redirect from '/'
type QueryRandom  = {kind: 'random',  seed: number};
type QuerySpecies = {kind: 'species', species: string};
type QueryRec     = {kind: 'rec',     sourceId: SourceId};
function matchQuery<X>(query: Query, cases: {
  none:    (query: QueryNone)    => X,
  random:  (query: QueryRandom)  => X,
  species: (query: QuerySpecies) => X,
  rec:     (query: QueryRec)     => X,
}): X {
  switch (query.kind) {
    case 'none':    return cases.none(query);
    case 'random':  return cases.random(query);
    case 'species': return cases.species(query);
    case 'rec':     return cases.rec(query);
  }
}

interface Props {
  // App globals
  serverConfig:            ServerConfig;
  modelsSearch:            ModelsSearch;
  location:                Location;
  history:                 MemoryHistory;
  go:                      Go;
  // Settings
  settings:                SettingsWrites;
  showDebug:               boolean;
  showMetadataLeft:        boolean;
  showMetadataBelow:       boolean;
  metadataColumnsLeft:     Array<MetadataColumnLeft>;
  metadataColumnsBelow:    Array<MetadataColumnBelow>;
  editing:                 boolean;
  seekOnPlay:              boolean;
  playingProgressEnable:   boolean;
  playingProgressInterval: number;
  spectroScale:            number;
  // SearchScreen
  spectroBase:             Dim<number>;
  spectroScaleClamp:       Clamp<number>;
}

interface State {
  scrollViewKey: string;
  scrollViewState: ScrollViewState;
  showGenericModal: null | (() => Element);
  showFilters: boolean;
  showHelp: boolean;
  totalRecs?: number;
  f_preds_cols?: Array<string>;
  // TODO Persist filters with settings
  //  - Top-level fields instead of nested object so we can use state merging when updating them in isolation
  filterQueryText?: string;
  filterQuality: Array<Quality>;
  filterLimit: number;
  excludeSpecies: Array<string>;
  excludeRecIds: Array<string>;
  recs: 'loading' | Array<Rec>;
  recsQueryInProgress?: Query,
  recsQueryShown?: Query;
  recsQueryTime?: number;
  sourceIdForActionModal?: SourceId;
  playing?: {
    rec: Rec,
    sound: Sound,
    startTime?: number,
    // progressTime?: number,
  };
  playingCurrentTime?: number;
  // Sync from/to Settings (1/3)
  _spectroScale: number;
};

export class SearchScreen extends PureComponent<Props, State> {

  // Getters for prevProps
  _pathParams = (props?: Props): SearchPathParams => {
    const {pathname} = (props || this.props).location;
    return searchPathParamsFromPath(pathname);
  }

  // Getters for this.props
  get pathParams (): SearchPathParams { return this._pathParams(); }

  // Getters for this.state
  get filters(): object { return _.pickBy(this.state, (v, k) => k.startsWith('filter')); }
  get recsOrEmpty(): Array<Rec> { return this.state.recs === 'loading' ? [] : this.state.recs; }

  static defaultProps = {
    spectroBase:       {height: 20, width: Dimensions.get('window').width},
    spectroScaleClamp: {min: 1, max: 8},
  };

  // Else we have to do too many setState's, which makes animations jump (e.g. ScrollView momentum)
  _scrollViewState: ScrollViewState = {
    contentOffset: {x: 0, y: 0},
  };

  state: State = {
    scrollViewKey: '',
    scrollViewState: this._scrollViewState,
    showGenericModal: null,
    showFilters: false,
    showHelp: false,
    filterQuality: ['A', 'B'],
    filterLimit: 30, // TODO How big vs. fast? (-> Settings with sane default)
    excludeSpecies: [],
    excludeRecIds: [],
    recs: 'loading',
    // Sync from/to Settings (2/3)
    _spectroScale: this.props.spectroScale,
  };

  db?: SQLiteDatabase;
  soundsCache: Map<SourceId, Promise<Sound> | Sound> = new Map();

  // (Unused, kept for reference)
  // sortActionSheet: RefObject<ActionSheet> = React.createRef();

  scrollViewRef: RefObject<SectionListStatic<Rec>> = React.createRef();

  // Avoid constructor
  //  - "If you don't initialize state and you don't bind methods, you don't need to implement a constructor"
  //  - https://reactjs.org/docs/react-component.html#constructor
  // constructor(props) { ... }

  // Avoid getDerivedStateFromProps
  //  - Use only to update state derived from (changed) props -- but avoid deriving state from props!
  //  - Prefer componentDidUpdate to side effect in response to changed props (e.g. fetch data, start animation)
  //  - Prefer memoization to re-run an expensive computation when a prop changes
  //  - Prefer fully controlled / fully uncontrolled with key to reset state when a prop changes
  //  - https://reactjs.org/docs/react-component.html#static-getderivedstatefromprops
  //  - https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
  // static getDerivedStateFromProps(props, state) { ... }

  // After component is first inserted into the DOM
  //  - Commit phase (impure, may read/write DOM, called once per commit)
  //  - Best practices
  //    - Do fetch data (-> setState() -> additional render(), which is ok)
  //    - Do subscribe listeners / scheduler timers (clean up in componentWillUnmount)
  //  - Details
  //    - First render() happens before this (don't try to avoid it, it's ok)
  //    - Immediate setState() will trigger render() a second time before the first screen draw
  componentDidMount = async () => {
    log.info(`${this.constructor.name}.componentDidMount`);
    global.SearchScreen = this; // XXX Debug

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

    // Query db size (once)
    log.info(`${this.constructor.name}.componentDidMount: Querying db size`);
    await querySql<{totalRecs: number}>(this.db!, `
      select count(*) as totalRecs
      from search_recs
    `)(async results => {
      log.info('SearchScreen.componentDidMount: state.totalRecs');
      const [{totalRecs}] = results.rows.raw();
      this.setState({
        totalRecs,
      });
    });

    // Query f_preds_* cols (once)
    log.info(`${this.constructor.name}.componentDidMount: Querying f_preds_* cols`);
    await querySql<Rec>(this.db!, `
      select *
      from search_recs
      limit 1
    `)(async results => {
      log.info('SearchScreen.componentDidMount: state.f_preds_cols');
      const [rec] = results.rows.raw();
      const n = Object.keys(rec).filter(k => k.startsWith('f_preds_')).length;
      // Reconstruct strings from .length to enforce ordering
      const f_preds_cols = _.range(n).map(i => `f_preds_${i}`);
      this.setState({
        f_preds_cols,
      });
    });

    // Query recs (from navParams.species)
    // log.debug('componentDidMount -> loadRecsFromQuery');
    await this.loadRecsFromQuery();

  }

  // Before a component is removed from the DOM and destroyed
  //  - Commit phase (impure, may read/write DOM, called once per commit)
  //  - Best practices
  //    - Do unsubscribe listeners / cancel timers (created in componentDidMount)
  //    - Don't setState(), since no more render() will happen for this instance
  componentWillUnmount = async () => {
    log.info(`${this.constructor.name}.componentWillUnmount`);

    // Tell other apps we're no longer using the audio device
    Sound.setActive(false);

    // Release cached sound resources
    await this.releaseSounds();

    // Clear timers
    timer.clearTimeout(this);

  }

  // After props/state change; not called for the initial render()
  //  - Commit phase (impure, may read/write DOM, called once per commit)
  //  - Best practices
  //    - Do operate on DOM in response to changed props/state
  //    - Do fetch data, conditioned on changed props/state (else update loops)
  //    - Do setState(), conditioned on changed props (else update loops)
  componentDidUpdate = async (prevProps: Props, prevState: State) => {
    log.info('SearchScreen.componentDidUpdate', shallowDiffPropsState(prevProps, prevState, this.props, this.state));

    // Reset view state if query changed
    //  - TODO Pass props.key to reset _all_ state? [https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#recap]
    if (!deepEqual(this.query, this._query(prevProps))) {
      log.info('SearchScreen.componentDidUpdate: Reset view state');
      this.setState({
        filterQueryText: undefined,
        excludeSpecies: [],
        excludeRecIds: [],
      });
    }

    // Else _scrollViewState falls behind on non-scroll/non-zoom events (e.g. +/- buttons)
    this._scrollViewState = this.state.scrollViewState;

    // Sync from/to Settings (3/3)
    //  - These aren't typical: we only use this for (global) settings keys that we also keep locally in state so we can
    //    batch-update them with other local state keys (e.g. global spectroScale + local scrollViewKey)
    //  - QUESTION What's a better pattern for "batch setState(x,y,z) locally + persist settings.set(x) globally"?
    if (this.state._spectroScale !== prevState._spectroScale) {
      noawait(this.props.settings.set('spectroScale', this.state._spectroScale));
    }

    // Query recs (from updated navParams.species)
    //  - (Will noop if deepEqual(query, state.recsQueryShown))
    // log.debug('componentDidUpdate -> loadRecsFromQuery');
    await this.loadRecsFromQuery();

  }

  randomPath = (seed?: number): string => {
    seed = seed !== undefined ? seed : chance.natural({max: 1e6});
    return `/random/${seed}`;
  }

  get spectroDim(): Dim<number> {
    return {
      height: this.props.spectroBase.height * this.state._spectroScale,
      width:  this.scrollViewContentWidths.image,
    };
  }

  // Manually specify widths of all components that add up to the ScrollView content width so we can explicitly compute
  // and set it, else the ScrollView won't scroll horizontally (the overflow direction)
  //  - https://github.com/facebook/react-native/issues/8579#issuecomment-233162695
  //  - I also tried using onLayout to automatically get subcomponent widths from the DOM instead of manually
  //    maintaining them all here, but that got gnarly and I bailed (bad onLayout/setState interactions causing infinite
  //    update loops, probably because I'm missing conditions in lifecycle methods like componentDidUpdate)
  get scrollViewContentWidth() { return _.sum(_.values(this.scrollViewContentWidths)); }
  get scrollViewContentWidths() {
    const sidewaysText = sidewaysTextWidth;
    const debugInfo    = !(this.props.showDebug && this.props.showMetadataLeft) ? 0 : 80; // Wide enough for 'n_recs: 123'
    const metadataLeft = !(this.props.showMetadataLeft && !this.props.showMetadataBelow) ? 0 : 65; // Wide enough for 'XC123456'
    return {
      // NOTE Conditions duplicated elsewhere (render, ...)
      recEditing:     !this.props.editing ? 0 : recEditingButtonWidth * this._recEditingButtons.length,
      sidewaysText,
      debugInfo,
      metadataLeft,
      image:          this.props.spectroBase.width * this.state._spectroScale + _.sum([
        -sidewaysText, // Squeeze image so that sidewaysText doesn't increase horizontal scroll
        -debugInfo,    // Squeeze image so that debugInfo doesn't increase horizontal scroll
        -metadataLeft, // Squeeze image so that metadataLeft doesn't increase horizontal scroll
      ]),
    };
  }

  get query(): Query { return this._query(); }
  _query = (props?: Props): Query => {
    return matchSearchPathParams<Query>(this._pathParams(props), {
      none:    ()           => ({kind: 'species', species: ''}),
      random:  ({seed})     => ({kind: 'random', seed}),
      species: ({species})  => ({kind: 'species', species}),
      rec:     ({sourceId}) => ({kind: 'rec', sourceId}),
    });
    // We ignore state.filterQueryText b/c TextInput.onSubmitEditing -> history.push -> navParams.species
  };

  get queryDesc(): string {
    return matchQuery(this.query, {
      none:    ()           => 'none',
      random:  ({seed})     => `random/${seed}`,
      species: ({species})  => species,
      rec:     ({sourceId}) => showSourceId(sourceId),
    });
  }

  loadRecsFromQuery = async () => {
    if (
      // Noop if we don't know f_preds_cols yet (assume we'll be called again)
      this.state.f_preds_cols &&
      // Noop if this.query is already shown
      !deepEqual(this.query, this.state.recsQueryShown) &&
      // Noop if this.query is already in progress
      !deepEqual(this.query, this.state.recsQueryInProgress) &&
      // Noop if this.query isn't valid
      matchQuery(this.query, {
        none:    ()           => true,
        random:  ({seed})     => true,
        species: ({species})  => species  !== '',
        rec:     ({sourceId}) => sourceId !== '',
      })
    ) {
      log.info('loadRecsFromQuery', pretty({query: this.query}));

      // Set loading state
      //  - TODO Fade previous recs instead of showing a blank screen while loading
      log.info("loadRecsFromQuery: state.recs = 'loading'");
      this.setState({
        recs: 'loading',
        recsQueryInProgress: this.query,
      });
      await this.releaseSounds(); // (Safe to do after clearing state.recs, since it uses this.soundsCache)

      // Can't use window functions until sqlite ≥3.25.x
      //  - TODO Waiting on: https://github.com/litehelpers/Cordova-sqlite-storage/issues/828

      const timer = new Timer();
      const _setRecs = ({recs}: {recs: 'loading' | Array<Rec>}): void => {
        log.info(`loadRecsFromQuery: state.recs = ${recs === 'loading' ? recs : `(${recs.length} recs)`}`);
        this.setState({
          recs,
          recsQueryShown: this.query,
          recsQueryTime: timer.time(),
        });
      };

      await matchQuery(this.query, {

        none: async () => {
          log.info(`loadRecsFromQuery: Got QueryNone, staying in 'loading'...`);
          _setRecs({recs: 'loading'});
        },

        // TODO Weight species uniformly (e.g. select random species, then select random recs)
        // TODO Get deterministic results from seed [how? sqlite doesn't support random(seed) or hash()]
        random: async ({seed}) => {
          log.info(`loadRecsFromQuery: Querying random recs`, json({seed}));
          await querySql<Rec>(this.db!, sqlf`
            select *
            from (
              select
                *,
                cast(taxon_order as real) as taxon_order_num
              from search_recs
              where true
                and quality in (${this.state.filterQuality})
              order by
                random()
              limit ${this.state.filterLimit}
            )
            order by
              taxon_order_num asc,
              source_id desc
          `)(async results => {
            const recs = results.rows.raw();
            _setRecs({recs});
          });
        },

        species: async ({species}) => {
          log.info('loadRecsFromQuery: Querying recs for species', json({species}));
          await querySql<Rec>(this.db!, sqlf`
            select *
            from (
              select
                *,
                cast(taxon_order as real) as taxon_order_num
              from search_recs
              where true
                and species in (${species.split(',').map(x => _.trim(x).toUpperCase())})
                and quality in (${this.state.filterQuality})
              order by
                source_id desc
              limit ${this.state.filterLimit}
            )
            order by
              taxon_order_num asc,
              source_id desc
          `)(async results => {
            const recs = results.rows.raw();
            _setRecs({recs});
          });
        },

        rec: async ({sourceId}) => {
          log.info('loadRecsFromQuery: Loading recs for query_rec', json({sourceId}));

          // Compute top n_per_sp recs per species by d_pc (cosine_distance)
          //  - TODO Replace with window functions after sqlite upgrade
          //    - https://github.com/litehelpers/Cordova-sqlite-storage/issues/828
          //  - Alternative approach w/o window functions:
          //    - Query query_rec from db.search_recs
          //      - (query_rec.preds is query_sp_p (= search.predict_probs(query_rec)))
          //    - Take top n_recs/n_per_sp species from query_rec.preds
          //    - Construct big sql query with one union per species (O(n_recs/n_per_sp)):
          //      - (... where species=? order by d_pc limit n_per_sp) union all (...) ...

          // Params
          const n_per_sp     = 3; // TODO(nav_rec_id) -> param
          const n_recs       = this.state.filterLimit;
          const f_preds_cols = this.state.f_preds_cols || [];
          const limit_top_sp = n_recs / n_per_sp + 1; // Close enough

          // Load query_rec from db
          const query_rec = await this.loadRec(sourceId);
          // log.debug('query_rec', query_rec); // XXX Debug

          // Bail if sourceId not found (e.g. from persisted history)
          if (!query_rec) {
            log.warn('loadRecsFromQuery: sourceId not found:', sourceId);
            _setRecs({recs: 'loading'});
            return;
          }

          // Read sp_p's (species probs) from query_rec.f_preds_*
          const sp_ps: Map<string, number> = new Map(zipSame(
            this.props.modelsSearch.classes_,
            f_preds_cols.map(c => rec_f_preds(query_rec)[c]),
          ));

          // Compute slp's (species (negative) log prob) from sp_p's
          const slp = (sp_p: number): number => Math.abs(-Math.log(sp_p)) // (abs for 1->0 i/o -0)
          const slps: Map<string, number> = mapMapValues(sp_ps, slp);

          // Compute in sql: cosine_distance(S.f_preds_*, Q.f_preds_*)
          //  - cosine_distance(x,y) = 1 - dot(x,y) / norm(x) / norm(y)
          const sqlDot = (f_preds_cols
            // .slice(0, 2) // XXX Debug: smaller query
            .map(c => sqlf`S.${SQL.raw(c)}*Q.${SQL.raw(c)}`).join(' + ') || '0'
          );
          const sqlCosineDist = sqlf`
            1 - (${SQL.raw(sqlDot)}) / S.norm_f_preds / Q.norm_f_preds
          `;

          // Rank species by slp (slp asc b/c sgn(slp) ~ -sgn(sp_p))
          const topSlps: Array<{species: string, slp: number}> = (
            _(Array.from(slps.entries()))
            .map(([species, slp]) => ({species, slp}))
            .sortBy(({slp}) => slp)
            .slice(0, limit_top_sp)
            .value()
          );

          // Inject sql table: slps -> (species, slp)
          const tableSlp = sqlf`
            select column1 as species, column2 as slp from (values ${SQL.raw(topSlps
              // .slice(0, 2) // XXX Debug: smaller query
              .map(({species, slp}) => sqlf`(${species}, ${slp})`)
              .join(', ')
            )})
          `;

          // Construct queries for each species
          //  - TODO Shorter query: refactor sqlCosineDist expr (1 per topSlps) into a shared `with` table (1 total)
          const sqlPerSpecies = (topSlps
            // .slice(0, 2) // XXX Debug: smaller query
            .map(({species, slp}) => sqlf`
              select
                S.*,
                ${SQL.raw(sqlCosineDist)} as d_pc
              from search_recs S
                left join (select * from search_recs where source_id = ${sourceId}) Q on true -- Only 1 row in Q
              where true
                and S.species = ${species}
                and S.quality in (${this.state.filterQuality})
                and S.source_id != ${sourceId} -- Exclude query_rec from results
              order by
                d_pc asc
              limit ${n_per_sp}
            `)
          );

          // Construct query
          const sql = sqlf`
            select
              S.*,
              coalesce(slp.slp, 1e38) as slp
            -- Must select * from (...) else union complains about nested order by
            from (${SQL.raw(sqlPerSpecies.map(x => `select * from (${x})`).join(' union all '))}) S
              left join (${SQL.raw(tableSlp)}) slp on S.species = slp.species
            order by
              slp asc,
              d_pc asc
            limit ${n_recs}
          `;

          // Run query
          log.info('loadRecsFromQuery: Querying recs for query_rec', json({sourceId}));
          await querySql<Rec>(this.db!, sql, {
            // logTruncate: null, // XXX Debug
          })(async results => {
            const recs = results.rows.raw();

            // HACK Inject query_rec as first result so it's visible at top
            //  - TODO Replace this with a proper display of query_rec at the top
            _setRecs({recs: [query_rec, ...recs]});

          });

        },

      });

    }
  }

  loadRec = async (sourceId: SourceId): Promise<Rec> => {
    log.info('[loadRec]', json({sourceId}));
    return await querySql<Rec>(this.db!, sqlf`
      select *
      from search_recs
      where source_id = ${sourceId}
    `)(async results => {
      const [rec] = results.rows.raw();
      return rec;
    });
  }

  releaseSounds = async () => {
    log.info(`[releaseSounds] Releasing ${this.soundsCache.size} cached sounds`);
    await Promise.all(
      Array.from(this.soundsCache).map(async ([sourceId, soundAsync]) => {
        log.debug('Releasing sound',
          showSourceId(sourceId), // Noisy (but these log lines don't de-dupe anyway when rndebugger timestamps are shown)
        );
        (await soundAsync).release();
      }),
    );
    this.soundsCache = new Map();
    this.setState({
      playing: undefined, // In case we were playing a sound, mark that we aren't anymore
    });
  }

  getOrAllocateSoundAsync = async (rec: Rec): Promise<Sound> => {
    // Is sound already allocated (in the cache)?
    let soundAsync = this.soundsCache.get(rec.source_id);
    if (!soundAsync) {
      log.debug('Allocating sound',
        showSourceId(rec.source_id), // Noisy (but these log lines don't de-dupe anyway when rndebugger timestamps are shown)
      );
      // Allocate + cache sound resource
      //  - Cache the promise so that get+set is atomic, else we race and allocate multiple sounds per rec.source_id
      //  - (Observable via log counts in the console: if num alloc > num release, then we're racing)
      this.soundsCache.set(rec.source_id, Sound.newAsync(
        Rec.audioPath(rec),
        Sound.MAIN_BUNDLE,
      ));
      soundAsync = this.soundsCache.get(rec.source_id);
    }
    return await soundAsync!;
  }

  toggleRecPlaying = (rec: Rec) => {

    // Eagerly allocate Sound resource for rec
    //  - TODO How eagerly should we cache this? What are the cpu/mem costs and tradeoffs?
    const soundAsync = this.getOrAllocateSoundAsync(rec);

    return async (event: Gesture.TapGestureHandlerStateChangeEvent) => {
      const {nativeEvent: {state, oldState, x, absoluteX}} = event; // Unpack SyntheticEvent (before async)
      if (
        // [Mimic Gesture.BaseButton]
        oldState === Gesture.State.ACTIVE &&
        state !== Gesture.State.CANCELLED
      ) {
        log.debug('toggleRecPlaying', pretty({x, sourceId: rec.source_id,
          playing: this.state.playing && {sourceId: this.state.playing.rec.source_id},
        }));

        // FIXME Race conditions: tap many spectros really quickly and watch the "Playing rec" logs pile up
        //  - Maybe have to replace react-native-audio with full expo, to get Expo.Audio?
        //    - https://docs.expo.io/versions/latest/sdk/audio
        //    - https://docs.expo.io/versions/latest/sdk/av.html
        //    - https://github.com/expo/expo/tree/master/packages/expo/src/av
        //    - https://github.com/expo/expo/blob/master/packages/expo/package.json

        const {playing} = this.state;

        // Workaround: Manually clean up on done/stop b/c the .play done callback doesn't trigger on .stop
        const onDone = async () => {
          log.info('Done: rec', rec.source_id);
          timer.clearInterval(this, 'playingCurrentTime');
          this.setState({
            playing: undefined,
          });
        };

        // Stop any recs that are currently playing
        if (playing) {
          const {rec, sound} = playing;
          global.sound = sound; // XXX Debug

          // Stop sound playback
          log.info('Stopping: rec', rec.source_id);
          if (sound.isLoaded()) { // Else we'll hang if sound was released while playing (e.g. play -> load new search)
            await sound.stopAsync();
          }
          await onDone();

        }

        // If touched rec was the currently playing rec, then we're done (it's stopped)
        // Else, play the (new) touched rec
        if (!this.recIsPlaying(rec.source_id, playing)) {
          const sound = await soundAsync;
          global.sound = sound; // XXX Debug

          // Compute startTime to seek rec (if enabled)
          let startTime;
          if (this.props.seekOnPlay) {
            startTime = this.spectroTimeFromX(sound, x, absoluteX);
          } else {
            // startTime = 0; // TODO Show some kind of visual feedback when not seekOnPlay
          }

          // Play rec (if startTime is valid)
          if (!startTime || startTime < sound.getDuration()) {
            log.info('Playing: rec', rec.source_id);

            // setState
            this.setState({
              playing: {
                rec,
                sound,
                startTime,
              },
              playingCurrentTime: 0,
            });

            // Update playingCurrentTime on interval (if enabled)
            //  - HACK react-native-sound doesn't have an onProgress callback, so we have to hack it ourselves :/
            //    - Ugh, waaay slow and cpu inefficient: 16ms (60fps) kills rndebugger in Debug and pegs cpu in Release
            //    - TODO Explore alternatives: if setState->render is the bottleneck, then investigate Animated...
            //  - WARNING Don't separate timers per rec.source_id until we resolve "FIXME Race conditions" above ("tap many")
            if (this.props.playingProgressEnable && this.props.playingProgressInterval !== 0) {
              timer.setInterval(this, 'playingCurrentTime',
                async () => {
                  const {seconds, isPlaying} = await sound.getCurrentTimeAsync();
                  if (isPlaying) {
                    this.setState({
                      playingCurrentTime: seconds,
                    });
                  }
                },
                this.props.playingProgressInterval,
              );
            }

            // Seek + play + clean up when done
            //  - Don't await: .playAsync promise fulfills after playback completes (/ is stopped / fails)
            if (startTime) sound.setCurrentTime(startTime);
            finallyAsync(sound.playAsync(), async () => {
              await onDone();
            });

          }

        }

      }
    };
  }

  spectroTimeFromX = (sound: Sound, x: number, absoluteX: number): number => {
    const {contentOffset} = this._scrollViewState;
    const {width} = this.spectroDim;
    const {audio_s} = this.props.serverConfig.api.recs.search_recs.params;
    const duration = sound.getDuration();
    const time = x / width * audio_s;
    // log.debug('spectroTimeFromX', pretty({time, x, absoluteX, contentOffset, width, audio_s, duration}));
    return time;
  }

  spectroXFromTime = (sound: Sound, time: number): number => {
    const {contentOffset} = this._scrollViewState;
    const {width} = this.spectroDim;
    const {audio_s} = this.props.serverConfig.api.recs.search_recs.params;
    const duration = sound.getDuration();
    const x = time / audio_s * width;
    // log.debug('spectroXFromTime', pretty({x, time, contentOffset, width, audio_s, duration}));
    return x;
  }

  recIsPlaying = (sourceId: SourceId, playing: undefined | {rec: Rec}): boolean => {
    return !playing ? false : playing.rec.source_id === sourceId;
  }

  onSpectroLongPress = (rec: Rec) => async (event: Gesture.LongPressGestureHandlerStateChangeEvent) => {
    const {nativeEvent: {state}} = event; // Unpack SyntheticEvent (before async)
    if (state === Gesture.State.ACTIVE) {
      this.showRecActionModal(rec);
    }
  }

  onBottomControlsLongPress = async (event: Gesture.LongPressGestureHandlerStateChangeEvent) => {
    const {nativeEvent: {state}} = event; // Unpack SyntheticEvent (before async)
    await match(state,
      [Gesture.State.ACTIVE, () => this.setState({showHelp: true})],
      [Gesture.State.END,    () => this.setState({showHelp: false})],
    )();
  }

  onMockPress = (rec: Rec) => async () => {
    console.log('renderLeftAction.onMockPress');
  }

  Filters = () => (
    <KeyboardDismissingView style={{width: '100%', height: '100%'}}>
      <View style={[
        styles.filtersModal,
        {marginBottom: TabBarStyle.portraitHeight},
      ]}>
        <TextInput
          style={styles.queryInput}
          value={this.state.filterQueryText}
          onChangeText={x => this.setState({filterQueryText: x})}
          onSubmitEditing={() => this.state.filterQueryText && (
            this.props.history.push(`/species/${encodeURIComponent(this.state.filterQueryText)}`)
          )}
          autoCorrect={false}
          autoCapitalize='characters'
          enablesReturnKeyAutomatically={true}
          placeholder={this.queryDesc}
          returnKeyType='search'
        />
        <Text>Filters</Text>
        <Text>- quality</Text>
        <Text>- month</Text>
        <Text>- species likelihood [bucketed ebird priors]</Text>
        <Text>- rec text search [conflate fields]</Text>
        <RectButton onPress={() => this.setState({showFilters: false})}>
          <View style={{padding: 10, backgroundColor: iOSColors.blue}}>
            <Text>Done</Text>
          </View>
        </RectButton>
      </View>
    </KeyboardDismissingView>
  );

  showRecActionModal = (rec: Rec) => {
    this.setState({
      sourceIdForActionModal: rec.source_id,
      showGenericModal: () => (
        this.RecActionModal(rec)
      )
    });
  }

  RecActionModal = (rec: Rec) => {
    const Separator = () => (
      <View style={{height: 5}}/>
    );
    const defaults = {
      buttonStyle: {
        marginVertical: 1,
        marginHorizontal: 5,
        paddingVertical: 2,
        paddingHorizontal: 5,
      } as ViewStyle,
    };
    return (
      <this.GenericModal>

        <this.GenericModalTitle title='Rec actions' />

        <Separator/>
        {this.ActionModalButtons({actions: [
          {
            ...defaults,
            label: `Search (${rec.species})`,
            iconName: 'search',
            buttonColor: iOSColors.blue,
            onPress: () => this.props.history.push(`/species/${encodeURIComponent(rec.species)}`),
          }, {
            ...defaults,
            label: `Search (${showSourceId(rec.source_id)})`,
            iconName: 'search',
            buttonColor: iOSColors.blue,
            onPress: () => this.props.history.push(`/rec/${encodeURIComponent(rec.source_id)}`),
          },
        ]})}

        <Separator/>
        {this.ActionModalButtons({actions: [
          {
            ...defaults,
            label: `Hide results (${rec.species})`,
            iconName: 'x',
            buttonColor: iOSColors.red,
            onPress: () => this.setState((state: State, props: Props) => ({
              excludeSpecies: [...state.excludeSpecies, rec.species],
            })),
          }, {
            ...defaults,
            label: `Hide results (${showSourceId(rec.source_id)})`,
            iconName: 'x',
            buttonColor: iOSColors.red,
            onPress: () => this.setState((state: State, props: Props) => ({
              excludeRecIds: [...state.excludeRecIds, rec.source_id],
            })),
          }
        ]})}

        <Separator/>
        {this.ActionModalButtons({actions: [
          {
            ...defaults,
            label: 'More species',
            iconName: 'plus-circle',
            buttonColor: iOSColors.purple,
            onPress: () => {},
          }, {
            ...defaults,
            label: 'Fewer species',
            iconName: 'minus-circle',
            buttonColor: iOSColors.purple,
            onPress: () => {},
          }, {
            ...defaults,
            label: 'More recs per species',
            iconName: 'plus-circle',
            buttonColor: iOSColors.purple,
            onPress: () => {},
          }, {
            ...defaults,
            label: 'Fewer recs per species',
            iconName: 'minus-circle',
            buttonColor: iOSColors.purple,
            onPress: () => {},
          }, {
            ...defaults,
            label: 'Add a species manually',
            iconName: 'plus-circle',
            buttonColor: iOSColors.purple,
            onPress: () => {},
          },
        ]})}

        <Separator/>
        {this.ActionModalButtons({actions: [
          {
            ...defaults,
            label: `Save to list (${rec.species})`,
            iconName: 'bookmark',
            buttonColor: iOSColors.orange,
            onPress: () => {},
          }, {
            ...defaults,
            label: `Save to list (${showSourceId(rec.source_id)})`,
            iconName: 'bookmark',
            buttonColor: iOSColors.orange,
            onPress: () => {},
          }, {
            ...defaults,
            label: 'Save all to new list',
            iconName: 'bookmark',
            buttonColor: iOSColors.orange,
            onPress: () => {},
          }, {
            ...defaults,
            label: 'Add all to existing list',
            iconName: 'bookmark',
            buttonColor: iOSColors.orange,
            onPress: () => {},
          },
        ]})}

        <Separator/>
        {this.ActionModalButtons({actions: [
          {
            ...defaults,
            label: 'Share list',
            iconName: 'share',
            buttonColor: iOSColors.green,
            onPress: () => {},
          },
        ]})}

      </this.GenericModal>
    );
  }

  // [Scratch] Scroll SectionList so that same ~top recs are showing after drawing with new item/section heights
  //  - TODO More experimentation needed
  // requestAnimationFrame(() => {
  //   if (this.scrollViewRef.current) {
  //     this.scrollViewRef.current.scrollToLocation({
  //       animated: false,
  //       sectionIndex: 3, itemIndex: 3, // TODO Calculate real values to restore
  //       viewPosition: 0, // 0: top, .5: middle, 1: bottom
  //     });
  //   }
  // });

  scaleSpectros = async (delta: number) => {
    this.setState((state, props) => {
      // Round current _spectroScale so that +1/-1 deltas snap back to non-fractional scales (e.g. after pinch zooms)
      const _spectroScale = this.clampSpectroScaleY(Math.round(state._spectroScale) + delta);
      return {
        _spectroScale,
        scrollViewState: {
          // FIXME Zoom in -> scroll far down+right -> use '-' button to zoom out -> scroll view clipped b/c contentOffset nonzero
          contentOffset: {
            x: this._scrollViewState.contentOffset.x * _spectroScale / state._spectroScale,
            y: this._scrollViewState.contentOffset.y * _spectroScale / state._spectroScale,
          },
        },
      };
    });
  }

  clampSpectroScaleY = (spectroScale: number): number => _.clamp(
    spectroScale,
    this.props.spectroScaleClamp.min,
    this.props.spectroScaleClamp.max,
  );

  BottomControls = (props: {}) => (
    <View style={styles.bottomControls}>
      {/* Help */}
      <this.BottomControlsButton
        help='Help'
        iconProps={{name: 'help-circle'}}
        onPress={() => {}}
      />
      {/* Filters */}
      <this.BottomControlsButton
        help='Filters'
        iconProps={{name: 'filter'}}
        onPress={() => this.setState({showFilters: true})}
      />
      {/* Toggle sort: species probs / rec dist / manual list */}
      <this.BottomControlsButton
        help='Sort'
        iconProps={{name: 'chevrons-down'}}
        // iconProps={{name: 'chevron-down'}}
        // iconProps={{name: 'arrow-down'}}
        // iconProps={{name: 'arrow-down-circle'}}
        onPress={() => this.setState({
          showGenericModal: () => (
            <this.ActionModal title='Sort' actions={[
              // this.state.queryRec ? [ // TODO queryRec
              {
                label: 'Sort by species, then by recs',
                iconName: 'chevrons-down',
                buttonColor: iOSColors.orange,
                onPress: () => {},
              }, {
                label: 'Sort by recs only',
                iconName: 'chevrons-down',
                buttonColor: iOSColors.orange,
                onPress: () => {},
              }, {
                label: 'Sort recs by similarity',
                iconName: 'chevrons-down',
                buttonColor: iOSColors.orange,
                onPress: () => {},
              }, {
                label: 'Order manually',
                iconName: 'chevrons-down',
                buttonColor: iOSColors.orange,
                onPress: () => {},
              },
            ]} />
          )
        })}
      />
      {/* Random recs */}
      <this.BottomControlsButton
        help='Random'
        // iconProps={{name: 'refresh-ccw'}}
        iconProps={{name: 'shuffle'}}
        onPress={() => this.props.history.push(this.randomPath())}
      />
      {/* Toggle editing [moving] controls for rec/species */}
      <this.BottomControlsButton
        // HACK Reduced from "editing" to just "moving"
        // - XXX this button after we figure out how the moving UI should work
        // help='Edit'
        help='Move'
        active={this.props.editing}
        // iconProps={{name: 'sliders'}}
        iconProps={{name: 'move'}}
        // iconProps={{name: 'edit'}}
        // iconProps={{name: 'edit-2'}}
        // iconProps={{name: 'edit-3'}}
        // iconProps={{name: 'layout', style: Styles.flipBoth}}
        onPress={() => this.props.settings.toggle('editing')}
      />
      {/* Toggle metadata: left */}
      <this.BottomControlsButton
        help='Info'
        active={this.props.showMetadataLeft}
        // iconProps={{name: 'file-minus'}}
        iconProps={{name: 'sidebar'}}
        onPress={() => this.props.settings.toggle('showMetadataLeft')}
        onLongPress={() => this.setState({
          showGenericModal: () => (
            <this.ActionModal title='Show columns' actions={
              objectKeysTyped(MetadataColumnsLeft).map(c => ({
                label: c,
                textColor: iOSColors.black,
                buttonColor: this.props.metadataColumnsLeft.includes(c) ? iOSColors.tealBlue : iOSColors.customGray,
                buttonStyle: {
                  marginVertical: 2,
                },
                dismiss: false,
                onPress: () => this.props.settings.update('metadataColumnsLeft', cs => (
                  (cs.includes(c) ? _.without(cs, c) : [...cs, c])
                  .filter(c => c in MetadataColumnsLeft) // Clean up invalid keys
                )),
              }))
            } />
          )
        })}
      />
      {/* Toggle metadata: below */}
      <this.BottomControlsButton
        help='Info'
        active={this.props.showMetadataBelow}
        // iconProps={{name: 'file-text'}}
        iconProps={{name: 'credit-card', style: Styles.flipVertical}}
        // iconProps={{name: 'sidebar', style: Styles.rotate270}}
        onPress={() => this.props.settings.toggle('showMetadataBelow')}
        onLongPress={() => this.setState({
          showGenericModal: () => (
            <this.ActionModal title='Show columns' actions={
              objectKeysTyped(MetadataColumnsBelow).map(c => ({
                label: c,
                textColor: iOSColors.black,
                buttonColor: this.props.metadataColumnsBelow.includes(c) ? iOSColors.tealBlue : iOSColors.customGray,
                buttonStyle: {
                  marginVertical: 2,
                },
                dismiss: false,
                onPress: () => this.props.settings.update('metadataColumnsBelow', cs => (
                  (cs.includes(c) ? _.without(cs, c) : [...cs, c])
                  .filter(c => c in MetadataColumnsBelow) // Clean up invalid keys
                )),
              }))
            } />
          )
        })}
      />
      {/* Toggle seekOnPlay crosshairs */}
      <this.BottomControlsButton
        help='Seek'
        active={this.props.seekOnPlay}
        iconProps={{name: 'crosshair'}}
        onPress={() => this.props.settings.toggle('seekOnPlay')}
      />
      {/* Zoom more/fewer recs (spectro height) */}
      {/* - TODO Disable when spectroScale is min/max */}
      <this.BottomControlsButton
        help='Dense'
        disabled={this.state._spectroScale === this.props.spectroScaleClamp.min}
        // iconProps={{name: 'align-justify'}} // 4 horizontal lines
        iconProps={{name: 'zoom-out'}}
        onPress={async () => await this.scaleSpectros(-1)}
      />
      <this.BottomControlsButton
        help='Tall'
        disabled={this.state._spectroScale === this.props.spectroScaleClamp.max}
        // iconProps={{name: 'menu'}}          // 3 horizontal lines
        iconProps={{name: 'zoom-in'}}
        onPress={async () => await this.scaleSpectros(+1)}
      />
    </View>
  );

  BottomControlsButton = (props: {
    help: string,
    iconProps: IconProps,
    onPress?: (pointerInside: boolean) => void,
    onLongPress?: () => void,
    active?: boolean,
    disabled?: boolean,
  }) => {
    const {style: iconStyle, ...iconProps} = props.iconProps;
    return (
      <LongPressGestureHandler
        onHandlerStateChange={event => (
          props.onLongPress
            ? event.nativeEvent.state === Gesture.State.ACTIVE && props.onLongPress()
            : this.onBottomControlsLongPress(event)
        )}
      >
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

  // (Unused, keeping for reference)
  // sectionsForRecs = (recs: Array<Rec>): Array<SectionListData<Rec>> => {
  //   const sections = [];
  //   let section;
  //   for (let rec of recs) {
  //     const title = rec.species;
  //     if (!section || title !== section.title) {
  //       if (section) sections.push(section);
  //       section = {
  //         title,
  //         data: [] as Rec[],
  //         species: rec.species,
  //         species_taxon_order: rec.species_taxon_order,
  //         species_com_name: rec.species_com_name,
  //         species_sci_name: rec.species_sci_name,
  //         recs_for_sp: rec.recs_for_sp,
  //       };
  //     }
  //     section.data.push(rec);
  //   }
  //   if (section) sections.push(section);
  //   return sections;
  // }

  RecEditingButtons = (props: {rec: Rec}) => (
    <View style={styles.recEditingView}>
      {this._recEditingButtons.map((f, i) => f(i, props.rec))}
    </View>
  );

  get _recEditingButtons() {
    return [

      (i: number, rec: Rec) => (
        <this.RecEditingButton
          key={i}
          iconName='move'
          onPress={() => {}}
        />
      ),

    ];
  }

  RecEditingButton = (props: {
    buttonStyle?: Style,
    iconStyle?: Style,
    iconName: string,
    onPress: (pointerInside: boolean) => void,
  }) => (
    <BorderlessButton
      style={[styles.recEditingButton, props.buttonStyle]}
      onPress={props.onPress}
    >
      <Feather
        style={[styles.recEditingIcon, props.iconStyle,
          // Compact icon to fit within tiny rows
          this.state._spectroScale >= 2 ? {} : {
            fontSize: this.state._spectroScale / 2 * material.headlineObject.fontSize!,
            lineHeight: this.state._spectroScale / 2 * material.headlineObject.lineHeight!,
          },
        ]}
        name={props.iconName}
      />
    </BorderlessButton>
  );

  GenericModal = (props: {
    children: ReactNode,
    // onDismiss?: () => void, // TODO Add this [requires more coupling with ActionModalButtons, which also does dismiss]
  }) => (
    // Background overlay: semi-transparent background + tap outside modal to dismiss
    <BaseButton
      onPress={() => this.setState({
        showGenericModal: null, // Dismiss modal
      })}
      style={{
        width: '100%', height: '100%', // Full screen
        backgroundColor: `${iOSColors.black}88`, // Semi-transparent overlay
        justifyContent: 'center', alignItems: 'center', // (vertical, horizontal)
      }}
    >
      {/* Modal */}
      <View style={{
        backgroundColor: iOSColors.white,
        padding: 15,
      }}>
        {props.children}
      </View>
    </BaseButton>
  );

  dismissGenericModal = () => {
  }

  GenericModalTitle = (props: {
    title: string,
    style?: TextStyle,
  }) => (
    <Text style={{
      alignSelf: 'center', // (horizontal)
      marginBottom: 5,
      ...material.titleObject,
      ...props.style,
    }}>
      {props.title}
    </Text>
  );

  ActionModal = (props: {
    title: string,
    titleStyle?: TextStyle,
    actions: Array<{
      label: string,
      iconName?: string,
      buttonColor?: string,
      textColor?: string,
      buttonStyle?: ViewStyle,
      dismiss?: boolean,
      onPress: () => void,
    }>,
  }) => (
    <this.GenericModal>
      <this.GenericModalTitle style={props.titleStyle} title={props.title} />
      {this.ActionModalButtons({actions: props.actions})}
    </this.GenericModal>
  );

  ActionModalButtons = (props: {
    actions: Array<{
      label: string,
      iconName?: string,
      buttonColor?: string,
      textColor?: string,
      buttonStyle?: ViewStyle,
      dismiss?: boolean,
      onPress: () => void,
    }>,
  }) => (
    props.actions.map(({
      label,
      iconName,
      buttonColor,
      textColor,
      buttonStyle,
      dismiss,
      onPress,
    }, i) => (
      <RectButton
        key={i}
        style={{
          flexDirection:    'row',
          alignItems:       'center',
          padding:          10,
          marginHorizontal: 10,
          marginVertical:   2,
          backgroundColor:  _.defaultTo(buttonColor, iOSColors.customGray),
          ..._.defaultTo(buttonStyle, {}),
        }}
        onPress={() => {
          if (_.defaultTo(dismiss, true)) {
            this.setState({
              showGenericModal: null, // Dismiss modal
            });
          }
          onPress();
        }}
      >
        {iconName && (
          <Feather
            style={{
              ...material.headlineObject,
              marginRight: 5,
              color: _.defaultTo(textColor, iOSColors.white),
            }}
            name={iconName}
          />
        )}
        <Text
          style={{
            ...material.buttonObject,
            color: _.defaultTo(textColor, iOSColors.white),
          }}
          children={label}
        />
      </RectButton>
    ))
  );

  // Assign color sequentially to species
  //  - Ensures no collisions unless specieses.length > color.length
  stylesForSpecies = (specieses: Array<string>, styles: Array<LabelStyle> = labelStyles): Map<string, LabelStyle> => {
    return new Map(specieses.map<[string, LabelStyle]>((species, i) => (
      [species, styles[i % styles.length]]
    )));
  }

  // Assign colors randomly to species
  stylesForSpeciesHash = (specieses: Array<string>, styles: Array<LabelStyle> = labelStyles): Map<string, LabelStyle> => {
    return new Map(specieses.map<[string, LabelStyle]>(species => (
      [species, styles[stringHash(species) % styles.length]]
    )));
  }

  ModalsAndActionSheets = () => (
    <View>
      <Modal
        visible={!!this.state.showGenericModal}
        animationType='none' // 'none' | 'slide' | 'fade'
        transparent={true}
        children={this.state.showGenericModal && this.state.showGenericModal()}
      />
      <Modal
        visible={this.state.showFilters}
        animationType='none' // 'none' | 'slide' | 'fade'
        transparent={true}
        children={this.Filters()}
      />
      {/* (Unused, kept for reference)
      <ActionSheetBasic
        innerRef={this.sortActionSheet}
        options={[
          ['Sort by species, then by recs', () => {}],
          ['Sort by recs only',             () => {}],
          ['Sort recs by similarity',       () => {}],
          ['Order manually',                () => {}],
        ]}
      />
      */}
    </View>
  );

  // Map props/state to a DOM node
  //  - Render phase (pure, no read/write DOM, may be called multiple times per commit or interrupted)
  render = () => {
    log.info(`${this.constructor.name}.render`);
    const styleForSpecies = this.stylesForSpecies(_.uniq(this.recsOrEmpty.map(rec => rec.species)));
    return (
      <View style={{
        flex: 1,
      }}>

        {/* Redirect: '/' -> '/random/:seed' */}
        <Route exact path='/' render={() => (
          <Redirect to={this.randomPath()} />
        )}/>

        {/* Loading spinner */}
        {this.state.recs === 'loading' && (
          <View style={{
            flex: 1,
            justifyContent: 'center',
          }}>
            <ActivityIndicator size='large' />
          </View>
        )}

        {/* Recs list (with pan/pinch) */}
        {/* - We use ScrollView instead of SectionList to avoid _lots_ of opaque pinch-to-zoom bugs */}
        {/* - We use ScrollView instead of manual gestures (react-native-gesture-handler) to avoid _lots_ of opaque animation bugs */}
        {this.state.recs !== 'loading' && (
          <ScrollView
            // @ts-ignore [Why doesn't this typecheck?]
            ref={this.scrollViewRef as RefObject<Component<SectionListStatic<Rec>, any, any>>}

            // Scroll/zoom
            //  - Force re-layout on zoom change, else bad things (that I don't understand)
            key={this.state.scrollViewKey}
            contentContainerStyle={{
              // ScrollView needs manually computed width to scroll in overflow direction (horizontal)
              //  - https://github.com/facebook/react-native/issues/8579#issuecomment-233162695
              width: this.scrollViewContentWidth,
            }}
            // This is (currently) the only place we use state.scrollViewState i/o this._scrollViewState
            contentOffset={tap(this.state.scrollViewState.contentOffset, x => {
              // log.debug('render.contentOffset', json(x)); // XXX Debug
            })}
            bounces={false}
            bouncesZoom={false}
            directionalLockEnabled={true} // Don't scroll vertical and horizontal at the same time (ios only)
            minimumZoomScale={this.props.spectroScaleClamp.min / this.state._spectroScale}
            maximumZoomScale={this.props.spectroScaleClamp.max / this.state._spectroScale}
            onScrollEndDrag={async ({nativeEvent}) => {
              // log.debug('onScrollEndDrag', json(nativeEvent)); // XXX Debug
              const {contentOffset, zoomScale, velocity} = nativeEvent;
              this._scrollViewState = {contentOffset};
              if (
                zoomScale !== 1              // Don't trigger zoom if no zooming happened (e.g. only scrolling)
                // && velocity !== undefined // [XXX Unreliable] Don't trigger zoom on 1/2 fingers released, wait for 2/2
              ) {
                const scale = zoomScale * this.state._spectroScale;
                // log.debug('ZOOM', json(nativeEvent)); // XXX Debug
                // Trigger re-layout so non-image components (e.g. text) redraw at non-zoomed size
                this.setState({
                  scrollViewState: this._scrollViewState,
                  _spectroScale: this.clampSpectroScaleY(scale),
                  scrollViewKey: chance.hash(), // Else bad things (that I don't understand)
                });
              }
            }}

            // TODO Sticky headers: manually calculate indices of species header rows
            // stickyHeaderIndices={!this.props.showMetadataBelow ? undefined : ...}

            // TODO Add footer with "Load more" button
            //  - Mimic SectionList.ListFooterComponent [https://facebook.github.io/react-native/docs/sectionlist#listfootercomponent]
            //  - Approach: add a final item to the recs list

            // Mimic a FlatList
            children={

              // (Unused, keeping for reference)
              // _.flatten(this.sectionsForRecs(this.state.recs).map(({
              //   title,
              //   data: recs,
              //   species,
              //   species_taxon_order,
              //   species_com_name,
              //   species_sci_name,
              //   recs_for_sp,
              // }, sectionIndex) => [
              //
              //   Species header
              //   this.props.showMetadataBelow && (
              //     <View
              //       key={`section-${sectionIndex}-${title}`}
              //       style={styles.sectionSpecies}
              //     >
              //       <Text numberOfLines={1} style={styles.sectionSpeciesText}>
              //         {species_com_name} (<Text style={{fontStyle: 'italic'}}>{species_sci_name}</Text>)
              //       </Text>
              //       {this.props.showDebug && (
              //         // FIXME Off screen unless zoom=1
              //         <this.DebugText numberOfLines={1} style={[{marginLeft: 'auto', alignSelf: 'center'}]}>
              //           ({recs_for_sp} recs)
              //         </this.DebugText>
              //       )}
              //     </View>
              //   ),

              // Rec rows
              this.recsOrEmpty.map((rec, recIndex) => [

                // Rec row (with editing buttons)
                <Animated.View
                  key={`row-${recIndex}-${rec.source_id}`}
                  style={{
                    flex: 1, flexDirection: 'row',
                    // Alternating row colors
                    // backgroundColor: recIndex % 2 == 0 ? iOSColors.white : iOSColors.lightGray,
                    // Compact controls/labels when zoom makes image smaller than controls/labels
                    ...(this.props.showMetadataBelow ? {} : {
                      height: this.spectroDim.height,
                    }),
                  }}
                >

                  {/* Rec editing buttons */}
                  {/* - NOTE Condition duplicated in scrollViewContentWidths */}
                  {this.props.editing && (
                    <this.RecEditingButtons rec={rec} />
                  )}

                  {/* Rec region without the editing buttons  */}
                  <LongPressGestureHandler onHandlerStateChange={this.onSpectroLongPress(rec)}>
                    <Animated.View style={{
                      flex: 1, flexDirection: 'column',
                    }}>

                      {/* Rec row */}
                      <View
                        style={{
                          flexDirection: 'row',
                          ...(this.props.showMetadataBelow ? {} : {
                            height: this.spectroDim.height, // Compact controls/labels when zoom makes image smaller than controls/labels
                          }),
                        }}
                      >

                        {/* Rec debug info */}
                        {this.props.showMetadataLeft && (
                          <this.DebugView style={{
                            padding: 0, // Reset padding:3 from debugView
                            width: this.scrollViewContentWidths.debugInfo,
                          }}>
                            <MetadataText style={Styles.debugText}>slp: {rec.slp && round(rec.slp, 2)}</MetadataText>
                            <MetadataText style={Styles.debugText}>d_pc: {rec.d_pc && round(rec.d_pc, 2)}</MetadataText>
                            <MetadataText style={Styles.debugText}>n_recs: {rec.recs_for_sp}</MetadataText>
                          </this.DebugView>
                        )}

                        {/* Rec metadata left */}
                        {this.props.showMetadataLeft && !this.props.showMetadataBelow && (
                          <View style={{
                            flexDirection: 'column',
                            width: this.scrollViewContentWidths.metadataLeft,
                            borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: iOSColors.midGray,
                          }}>
                            {/* Ignore invalid keys. Show in order of MetadataColumnsLeft. */}
                            {objectKeysTyped(MetadataColumnsLeft).map(c => this.props.metadataColumnsLeft.includes(c) && (
                              <MetadataText key={c} children={MetadataColumnsLeft[c](rec)} />
                            ))}
                          </View>
                        )}

                        {/* Sideways species label */}
                        {/* - After controls/metadata so that label+spectro always abut (e.g. if scrolled all the way to the right) */}
                        {/* - NOTE Keep outside of TapGestureHandler else spectroTimeFromX/spectroXFromTime have to adjust */}
                        <View style={[styles.recSpeciesSidewaysView, {
                          backgroundColor: styleForSpecies.get(rec.species)!.backgroundColor,
                        }]}>
                          <View style={styles.recSpeciesSidewaysViewInner}>
                            <Text numberOfLines={1} style={[styles.recSpeciesSidewaysText, {
                              fontSize: this.state._spectroScale >= 2 ? 11 : 6, // Compact species label to fit within tiny rows
                              color: styleForSpecies.get(rec.species)!.color,
                            }]}>
                              {rec.species}
                            </Text>
                          </View>
                        </View>

                        {/* Spectro (tap) */}
                        <TapGestureHandler onHandlerStateChange={this.toggleRecPlaying(rec)}>
                          <Animated.View>

                            {/* Image */}
                            <Animated.Image
                              style={this.spectroDim}
                              resizeMode='stretch'
                              source={{uri: Rec.spectroPath(rec)}}
                            />

                            {/* Start time cursor (if playing + startTime) */}
                            {this.recIsPlaying(rec.source_id, this.state.playing) && (
                              this.state.playing!.startTime && (
                                <View style={{
                                  position: 'absolute', width: 1, height: '100%',
                                  left: this.spectroXFromTime(this.state.playing!.sound, this.state.playing!.startTime!),
                                  backgroundColor: iOSColors.gray,
                                }}/>
                              )
                            )}

                            {/* Progress time cursor (if playing + playingCurrentTime) */}
                            {this.recIsPlaying(rec.source_id, this.state.playing) && (
                              this.state.playing!.startTime && this.state.playingCurrentTime !== undefined && (
                                <View style={{
                                  position: 'absolute', width: 1, height: '100%',
                                  left: this.spectroXFromTime(this.state.playing!.sound, this.state.playingCurrentTime),
                                  backgroundColor: iOSColors.black,
                                }}/>
                              )
                            )}

                            {/* HACK Visual feedback for playing rec [XXX after adding progress bar by default] */}
                            {this.recIsPlaying(rec.source_id, this.state.playing) && (
                              <View style={{
                                position: 'absolute', height: '100%', width: 5,
                                left: 0,
                                backgroundColor: iOSColors.red,
                              }}/>
                            )}

                            {/* HACK Visual feedback for long-press ActionModal rec */}
                            {/* - HACK Condition on showGenericModal b/c we can't (yet) onDismiss to unset sourceIdForActionModal */}
                            {this.state.showGenericModal && this.state.sourceIdForActionModal === rec.source_id && (
                              <View style={{
                                position: 'absolute', height: '100%', width: 5,
                                left: 0,
                                backgroundColor: iOSColors.black,
                              }}/>
                            )}

                          </Animated.View>
                        </TapGestureHandler>

                      </View>

                      {/* Rec metadata below */}
                      {this.props.showMetadataBelow && (
                        <View style={{
                          width: Dimensions.get('window').width, // Fit within the left-most screen width of ScrollView content
                          flexDirection: 'column',
                          // borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: iOSColors.black, // TODO Make full width
                          marginTop: 3,
                          // marginBottom: 3,
                        }}>
                          {/* Ignore invalid keys. Show in order of MetadataColumnsLeft. */}
                          {objectKeysTyped(MetadataColumnsBelow).map(c => this.props.metadataColumnsBelow.includes(c) && (
                            <MetadataText
                              key={c}
                              style={{
                                marginBottom: 3,
                              }}
                            >
                              <Text style={{
                                ...material.captionObject,
                                fontWeight: 'bold',
                              }}>{c}:</Text> {MetadataColumnsBelow[c](rec)}
                            </MetadataText>
                          ))}
                        </View>
                      )}

                    </Animated.View>
                  </LongPressGestureHandler>

                </Animated.View>

              ])

            }

          />
        )}

        {/* Debug info */}
        <this.DebugView>
          <this.DebugText>queryDesc: {this.queryDesc}</this.DebugText>
          <this.DebugText>
            Recs: {this.state.recs === 'loading'
              ? `.../${this.state.totalRecs || '?'}`
              : `${this.state.recs.length}/${this.state.totalRecs || '?'} (${sprintf('%.3f', this.state.recsQueryTime)}s)`
            }
          </this.DebugText>
          <this.DebugText>Filters: {json(this.filters)}</this.DebugText>
        </this.DebugView>

        {/* Bottom controls */}
        <this.BottomControls/>

        {/* Modals + action sheets */}
        <this.ModalsAndActionSheets/>

      </View>
    );
  }

  // Debug components
  //  - [Tried and gave up once to make well-typed generic version of these (DebugFoo = addStyle(Foo, ...) = withProps(Foo, ...))]
  DebugView = (props: RN.ViewProps & {children: any}) => (
    !this.props.showDebug ? null : (
      <View {...{
        ...props,
        style: [Styles.debugView, ...sanitizeStyle(props.style)],
      }}/>
    )
  );
  DebugText = (props: RN.TextProps & {children: any}) => (
    !this.props.showDebug ? null : (
      <Text {...{
        ...props,
        style: [Styles.debugText, ...sanitizeStyle(props.style)],
      }}/>
    )
  );

}

// (Not sure about this type)
function sanitizeStyle<X extends {}>(style: undefined | null | X | Array<X>): Array<X> {
  return (
    !style ? [] :
    style instanceof Array ? style :
    [style]
  );
}

// TODO Why is this slow to respond after keyboard shows? -- adding logging to find the bottleneck
interface KeyboardDismissingViewState {
  isKeyboardShown: boolean;
}
export class KeyboardDismissingView extends PureComponent<RN.ViewProps, KeyboardDismissingViewState> {
  state = {
    isKeyboardShown: false,
  };
  _keyboardDidShowListener?: {remove: () => void};
  _keyboardDidHideListener?: {remove: () => void};
  componentDidMount = () => {
    this._keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow);
    this._keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);
  };
  componentWillUnmount = () => {
    this._keyboardDidShowListener!.remove();
    this._keyboardDidHideListener!.remove();
  };
  componentDidUpdate = (prevProps: RN.ViewProps, prevState: KeyboardDismissingViewState) => {
    log.info(`${this.constructor.name}.componentDidUpdate`, shallowDiffPropsState(prevProps, prevState, this.props, this.state));
  };
  keyboardDidShow = () => this.setState({isKeyboardShown: true});
  keyboardDidHide = () => this.setState({isKeyboardShown: false});
  render = () => (
    <TapGestureHandler
      enabled={this.state.isKeyboardShown}
      onHandlerStateChange={({nativeEvent: {state}}) => Keyboard.dismiss()}
      // TODO Need to condition on state?
      // onHandlerStateChange={({nativeEvent: {state}}) => state === Gesture.State.ACTIVE && Keyboard.dismiss()}
    >
      <Animated.View {...this.props} />
    </TapGestureHandler>
  );
}

// XXX
// function KeyboardDismissingView(props: RN.ViewProps) {
//   return (
//     <TapGestureHandler
//       onHandlerStateChange={({nativeEvent: {state}}) => state === Gesture.State.ACTIVE && Keyboard.dismiss()}
//     >
//       <Animated.View {...props} />
//     </TapGestureHandler>
//   );
// }

const styles = StyleSheet.create({
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
  sectionSpecies: {
    flexDirection: 'row',
    // ...material.body1Object, backgroundColor: iOSColors.customGray, // Black on white
    ...material.body1WhiteObject, backgroundColor: iOSColors.gray, // White on black
  },
  sectionSpeciesText: {
    alignSelf: 'center', // Align text vertically
  },
  recSpeciesSidewaysView: {
    justifyContent: 'center',        // Else sideways text is to the above
    alignItems: 'center',            // Else sideways text is to the right
    width: sidewaysTextWidth,        // HACK Manually shrink outer view width to match height of sideways text
    zIndex: 1,                       // Over spectro image
  },
  recSpeciesSidewaysViewInner: {     // View>View>Text else the text aligment doesn't work
    transform: [{rotate: '270deg'}], // Rotate text sideways
    width: 100,                      // Else text is clipped to outer view's (smaller) width
  },
  recSpeciesSidewaysText: {
    alignSelf: 'center',             // Else sideways text is to the bottom
    // fontSize: ...,                // Set dynamically
    // ...material.captionObject,    // (Sticking with default color:'black')
  },
  recEditingView: {
    flexDirection: 'row',
    zIndex: 1, // Over spectro image
  },
  recEditingButton: {
    width: recEditingButtonWidth, // Need explicit width (i/o flex:1) else view shows with width:0
    justifyContent: 'center', // Align icon vertically
    backgroundColor: iOSColors.midGray,
  },
  recEditingIcon: {
    // ...material.titleObject,
    ...material.headlineObject,
    alignSelf: 'center', // Align icon horizontally
  },
});
