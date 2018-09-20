import inspect
import linecache
import numbers
from typing import Sequence

from more_itertools import one
import pandas as pd
from potoo.pandas import *
import structlog

from api.server_globals import sg
from api.util import *
from cache import *
from datasets import xc_meta_to_paths, xc_meta_to_raw_recs, xc_raw_recs_to_recs
from sp14.model import rec_neighbors_by, rec_probs, Search
from util import *
from viz import *


def xc_meta(
    species: str,
    quality: str = None,
    n_recs: int = 10,
) -> pd.DataFrame:

    # Params
    species = species_for_query(species)
    quality = quality or 'ab'
    quality = [q.upper() for q in quality]
    quality = [{'N': 'no score'}.get(q, q) for q in quality]
    n_recs = np.clip(n_recs, 0, 50)

    return (sg.xc_meta
        [lambda df: df.species == species]
        [lambda df: df.quality.isin(quality)]
        [:n_recs]
    )


def xc_species_html(
    species: str = None,
    quality: str = None,
    n_recs: int = 10,
    audio_s: float = 10,
    thumb_s: float = 0,
    scale: float = 2,
) -> pd.DataFrame:

    # Params
    require(n_recs > 0)
    require(audio_s > 0)
    species = species_for_query(species)
    if not species: return pd.DataFrame([])
    quality = quality or 'ab'
    quality = [q.upper() for q in quality]
    quality = [{'N': 'no score'}.get(q, q) for q in quality]
    n_recs = np.clip(n_recs, 0, 50)
    audio_s = np.clip(audio_s, 0, 30)
    thumb_s = np.clip(thumb_s, 0, 10)
    scale = np.clip(scale, .5, 10)

    return (sg.xc_meta
        [lambda df: df.species == species]
        .pipe(require_nonempty_df, 'No recs found', species=species)
        [lambda df: df.quality.isin(quality)]
        .pipe(require_nonempty_df, 'No recs found', species=species, quality=quality)
        .sort_index(ascending=True)  # This is actually descending... [why?]
        [:n_recs]
        .reset_index(drop=True)  # Drop RangeIndex
        .pipe(recs_featurize, audio_s=audio_s, thumb_s=thumb_s, scale=scale)
        .reset_index()  # xc_id
        .pipe(recs_view)
        [lambda df: [c for c in [
            'xc', 'xc_id',
            'com_name', 'species', 'quality',
            'thumb', 'slice',
            'duration_s', 'month_day', 'background_species', 'place', 'remarks',
        ] if c in df]]
    )


def xc_similar_html(
    xc_id: int,
    quality: str = None,
    n_sp: int = 3,
    n_recs_r: int = 3,
    n_total: int = 9,
    audio_s: float = 10,
    thumb_s: float = 0,
    scale: float = 2,
    sort: str = 'dist_p',
    **plot_many_kwargs,
) -> pd.DataFrame:

    # Params
    require(audio_s > 0)
    quality  = quality or 'ab'
    quality  = [q.upper() for q in quality]
    quality  = [{'N': 'no score'}.get(q, q) for q in quality]
    n_sp     = n_sp     and np.clip(n_sp,     0,  None)  # TODO Try unlimited (was: 50)
    n_recs_r = n_recs_r and np.clip(n_recs_r, 0,  None)  # TODO Try unlimited (was: 1000)
    n_total  = n_total  and np.clip(n_total,  0,  None)  # TODO Try unlimited (was: 100)
    audio_s  = audio_s  and np.clip(audio_s,  0,  30)
    thumb_s  = thumb_s  and np.clip(thumb_s,  0,  10)
    scale    = scale    and np.clip(scale,    .5, 10)

    # Lookup query_rec from xc_meta
    query_rec = (sg.xc_meta
        [lambda df: df.id == xc_id]
        .pipe(require_nonempty_df, 'No recs found', xc_id=xc_id)
        .pipe(recs_featurize_metdata_audio_slice, audio_s=audio_s)
        .pipe(recs_featurize_feat)
        .pipe(lambda df: one(df_rows(df)))
    )

    # Compute query_sp_p from search
    query_sp_p = (
        rec_probs(query_rec, sg.search)
        [:n_sp]
        .rename(columns={'p': 'sp_p'})
    )

    # Compute search_recs from xc_meta, and featurize (.audio, .feat)
    #   - TODO Featurize is slow and heavy, because we can't filter yet until we have .dist, which relies on .feat...
    # memory.log.level = 'debug'  # TODO Nontrivial number of cache misses slowing us down -- why are there misses?
    search_recs = (sg.xc_meta
        # Filter
        [lambda df: df.species.isin(query_sp_p.species)]
        .pipe(require_nonempty_df, 'No recs found', species=query_sp_p.species)
        [lambda df: df.quality.isin(quality)]
        .pipe(require_nonempty_df, 'No recs found', species=query_sp_p.species, quality=quality)
        .pipe(df_remove_unused_categories)
        # Sample n_recs_r per species
        .pipe(lambda df: df if n_recs_r is None else (df
            .groupby('species').apply(lambda g: (g
                .sample(n=min(n_recs_r, len(g)), random_state=0)  # TODO HACK Sample to make go faster, until we build up a full cache
            ))
        ))
        .reset_index(level=0, drop=True)  # species, from groupby
        # Featurize
        .pipe(recs_featurize_metdata_audio_slice, audio_s=audio_s)
        .pipe(recs_featurize_feat)
        # Include query_rec in results (already featurized)
        .pipe(lambda df: df if query_rec.name in df.index else pd.concat(
            sort=True,  # [Silence "non-concatenation axis" warning -- not sure what we want, or if it matters...]
            objs=[
                DF([query_rec]).pipe(df_set_index_name, 'xc_id'),  # Restore index name, lost by df->series->df
                df,
            ],
        ))
    )

    # Compute .dist from (query_rec + search_recs).feat
    dist_recs = (
        rec_neighbors_by(
            query_rec=query_rec,
            search_recs=search_recs if query_rec.name in search_recs.index else pd.concat(
                sort=True,  # [Silence "non-concatenation axis" warning -- not sure what we want, or if it matters...]
                objs=[
                    DF([query_rec]).pipe(df_set_index_name, 'xc_id'),  # HACK Force compat with xc_recs, e.g. if from user_recs
                    search_recs,
                ],
            ),
            by=Search.X,  # TODO Add user control to toggle dist function
        )
        .reset_index()  # xc_id
    )

    # [orphaned] [later] TODO Restore n_recs (maybe after we've built enough cache to no longer need n_recs_r?)
    # .groupby('species').apply(lambda g: (g
    #     .sort_values('dist', ascending=True)
    #     [:n_recs]
    # ))
    # .reset_index(level=0, drop=True)  # species, from groupby

    # Rank results
    #   - TODO TODO Make a meaningful score that combines (dist, sp_p)
    #     - TODO Map dist to a prob, so combining ops can all operate in prob space (e.g. ebird_priors prob, once we add it)
    #   - [later] TODO Add ebird_priors prob
    result_recs = (dist_recs
        .reset_index()  # xc_id
        # Join in .sp_p for scoring functions
        #   - [Using sort=True to silence "non-concatenation axis" warning -- not sure what we want, or if it matters]
        .merge(how='left', on='species', right=query_sp_p[['species', 'sp_p']],
            sort=True,  # [Silence "non-concatenation axis" warning -- not sure what we want, or if it matters...]
        )
        # Score(s)
        .assign(
            sp_p=lambda df: df.sp_p,
            dist=lambda df: -df.dist,
            dist_p=lambda df: df.dist * df.sp_p,
        )
        # Sort (by user-chosen scoring function)
        .sort_values(sort, ascending=False)
        # Limit
        [:n_total]
    )

    # Featurize result_recs: .spectro + recs_view
    return (result_recs
        .pipe(recs_featurize_slice_thumb, audio_s=audio_s, thumb_s=thumb_s, scale=scale, **plot_many_kwargs)
        .pipe(recs_view)
        [lambda df: [c for c in [
            'xc', 'xc_id',
            *unique_everseen([
                sort,  # Show sort col first, for feedback to user
                'sp_p', 'dist', 'dist_p',  # Order by primitive->derived
            ]),
            'com_name', 'species', 'quality',
            'thumb', 'slice',
            'duration_s', 'month_day', 'background_species', 'place', 'remarks',
        ] if c in df]]
    )


def recs_featurize(
    recs: pd.DataFrame,
    audio_s: float,
    thumb_s: float,
    scale: float,
    **plot_many_kwargs,
) -> pd.DataFrame:
    return (recs
        .pipe(recs_featurize_metdata_audio_slice, audio_s=audio_s)
        .pipe(recs_featurize_feat)
        .pipe(recs_featurize_slice_thumb, audio_s=audio_s, thumb_s=thumb_s, scale=scale, **plot_many_kwargs)
    )


progress_kwargs = dict(
    # use='dask', scheduler='threads',
    use=None,  # XXX Debug: silence progress bars to debug if we're doing excessive read/write ops after rebuild_cache
)


def recs_featurize_metdata_audio_slice(recs: pd.DataFrame, audio_s: float) -> pd.DataFrame:
    """Featurize: Add .audio with slice"""
    assert audio_s is not None and audio_s > 0, f"{audio_s}"
    # FIXME "10.09s bug": If you write a 10s-sliced audio to mp4 you get 10.09s in the mp4 file
    #   - To inspect, use `ffprobe` or `ffprobe -show_packets`
    #   - This messes up e.g. any spectro/slice/thumb that expects its input to be precisely ≤10s, else it wraps
    #   - All downstreams currently have to deal with this themselves, e.g. via plot_slice(slice_s=10)
    #   - Takeaways after further investigation:
    #       - It's just a fact of life that non-pcm mp4/mp3 encodings don't precisely preserve audio duration
    #       - We can always precisely slice the pcm samples once they're decoded from mp4/mp3, but as long as we're
    #         dealing in non-pcm encodings (for compression) we're stuck dealing with imprecise audio durations
    try:
        # Try loading sliced .audio directly
        return (recs
            .pipe(recs_featurize_metadata, to_paths=lambda recs: [
                (dataset, abs_sliced_path)
                for (dataset, abs_path) in xc_meta_to_paths(recs)
                for id in [str(Path(abs_path).relative_to(data_dir))]
                for sliced_id in [audio_id_add_ops(id,
                    # HACK Find a principled way to synthesize id for sliced audio (multiple concerns to untangle...)
                    'resample(%(sample_rate)s,%(channels)s,%(sample_width_bit)s)' % sg.load.audio_config,
                    'enc(wav)',
                    'slice(%s,%s)' % (0, int(1000 * audio_s)),
                    'spectro_denoise()',
                    'enc(%(format)s,%(codec)s,%(bitrate)s)' % config.audio_persist.audio_kwargs,
                )]
                for abs_sliced_path in [str(Path(data_dir) / sliced_id)]
            ])
            .pipe(recs_featurize_audio, load=load_for_audio_persist())
        )
    except FileNotFoundError:
        # Fallback to loading full .audio and computing the slice ourselves (which will cache for next time)
        log.warn('Falling back to uncached audio slices', audio_s=audio_s, len_recs=len(recs))
        return (recs
            .pipe(recs_featurize_metadata)
            .pipe(recs_featurize_audio, load=sg.load)
            .pipe(recs_featurize_slice, audio_s=audio_s)
            .pipe(recs_audio_persist, progress_kwargs=progress_kwargs)
        )


# TODO Sort out "audio metadata" vs. "xc_meta"
#   - How about unify by folding audio metadata into xc_meta like page metadata?
#       def xc_meta_to_raw_recs(load):
#           xc_paths = xc_meta.map(...)
#           xc_raw_recs = (
#               load.recs(xc_paths)
#               .join(xc_meta.pipe(clean))
#           )
def recs_featurize_metadata(recs: pd.DataFrame, to_paths=None) -> pd.DataFrame:
    """Featurize: Add audio metadata (not .audio) <- xc_meta"""
    return (recs
        .pipe(xc_meta_to_raw_recs, to_paths=to_paths, load=sg.load)
    )


def recs_featurize_audio(
    recs: pd.DataFrame,
    load,  # Explicit load to help us stay aware of which one we're using at all times (lots of wav vs. mp4 confusion)
) -> pd.DataFrame:
    """Featurize: Add .audio"""
    return (recs
        .pipe(load.audio, **progress_kwargs)  # procs barf on serdes error
    )


def recs_featurize_slice(recs: pd.DataFrame, audio_s: float) -> pd.DataFrame:
    """Featurize: Slice .audio (before .spectro/.feat/.thumb)"""
    return (recs
        .pipe(df_map_rows_progress, desc='slice_audio', **progress_kwargs, f=lambda row: (
            sg.features.slice_audio(row, 0, audio_s)
        ))
    )


def recs_featurize_feat(recs: pd.DataFrame) -> pd.DataFrame:
    """Featurize: Add .feat"""
    return (recs
        .pipe(sg.projection.transform)
    )


def recs_featurize_slice_thumb(
    recs: pd.DataFrame,
    audio_s: float,
    thumb_s: float,
    scale: float,
    **plot_many_kwargs,
) -> pd.DataFrame:
    """Featurize: Add .thumb, .slice <- .spectro, .audio"""
    plot_many_kwargs = {
        **plot_many_kwargs,
        'scale': dict(h=int(40 * scale)),  # Best if h is multiple of 40 (because of low-level f=40 in Melspectro)
        'progress': dict(**progress_kwargs),  # threads > sync, threads >> processes
        '_nocache': True,  # Dev: disable plot_many cache since it's blind to most of our sub-many code changes [TODO Revisit]
    }
    return (recs
        .pipe(recs_featurize_spectro)
        # Clip .audio/.spectro to audio_s/thumb_s
        .pipe(df_assign_first, **{
            **({} if not audio_s else dict(
                slice=df_cell_spectros(plot_slice.many, sg.features, **plot_many_kwargs,
                    pad_s=audio_s,  # Use pad_s instead of slice_s, else excessive writes (slice->mp4->slice->mp4)
                ),
            )),
            **({} if not thumb_s else dict(
                thumb=df_cell_spectros(plot_thumb.many, sg.features, **plot_many_kwargs,
                    thumb_s=thumb_s,
                ),
            )),
        })
    )


def recs_featurize_spectro(recs: pd.DataFrame) -> pd.DataFrame:
    """Featurize: Add .spectro"""
    return (recs
        # HACK Workaround some bug I haven't debugged yet
        #   - In server, .spectro column is present but all nan, which breaks downstream
        #   - In notebook, works fine
        #   - Workaround: force-drop .spectro column if present
        #   - Tech debt: Not general, very error prone -- e.g. does this affect .feat? .audio?
        .drop(columns=['spectro'], errors='ignore')
        .assign(spectro=lambda df: sg.features.spectro(df, **progress_kwargs, cache=True))  # threads >> sync, procs
    )


def recs_view(recs: pd.DataFrame) -> pd.DataFrame:
    df_if_col = lambda df, col, f: df if col not in df else f(df)
    df_col_map_if_col = lambda df, **cols: df_col_map(df, **{k: v for k, v in cols.items() if k in df})
    return (recs
        .pipe(df_col_map_if_col,
            dist_p = lambda x: '''<a href="{{ req_query_with(sort='dist_p') }}" >%.1f</a>''' % x,
            dist   = lambda x: '''<a href="{{ req_query_with(sort='dist')   }}" >%.1f</a>''' % x,
            sp_p   = lambda x: '''<a href="{{ req_query_with(sort='sp_p')   }}" >%.2f</a>''' % x,
        )
        .pipe(df_if_col, 'xc_id', lambda df: (df
            .assign(
                # TODO Simplify: Have to do .xc before .xc_id, since we mutate .xc_id
                xc=lambda df: df_map_rows(df, lambda row: f'''
                    <a href="https://www.xeno-canto.org/%(xc_id)s">XC</a>
                ''' % row),
                xc_id=lambda df: df_map_rows(df, lambda row: '''
                    <a href="{{ req_href('/recs/xc/similar')(xc_id=%(xc_id)r) }}">%(xc_id)s</a>
                ''' % row),
            )
        ))
        .pipe(df_if_col, 'species', lambda df: (df
            .rename(columns={
                'species_com_name': 'com_name',
            })
            .assign(
                # TODO Simplify: Have to save .species/.com_name, since we mutate both
                _species=lambda df: df.species,
                _com_name=lambda df: df.com_name,
                species=lambda df: df_map_rows(df, lambda row: '''
                    <a href="{{ req_href('/recs/xc/species')(species=%(_species)r) }}" title="%(_com_name)s" >%(_species)s</a>
                ''' % row),
                com_name=lambda df: df_map_rows(df, lambda row: '''
                    <a href="{{ req_href('/recs/xc/species')(species=%(_species)r) }}" title="%(_species)s"  >%(_com_name)s</a>
                ''' % row),
            )
        ))
        .pipe(df_col_map_if_col,
            background_species=lambda xs: ', '.join(xs),
        )
    )


def species_for_query(species_query: str) -> str:
    species_query = species_query and species_query.strip()
    species = metadata.species[species_query]
    if not species:
        raise ApiError(400, 'No species found', species_query=species_query)
    return species.shorthand


def require(x: bool, **data):
    if not x:
        caller = inspect.stack(context=0)[1]
        require_stmt = linecache.getline(caller.filename, caller.lineno).strip()
        raise ApiError(400, require_stmt, **data)


def require_nonempty_df(df: pd.DataFrame, msg: str, **data) -> pd.DataFrame:
    if df.empty:
        raise ApiError(400, msg, **data)
    return df
