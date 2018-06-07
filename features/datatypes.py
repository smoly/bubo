from collections import OrderedDict
from typing import Iterable, Tuple, Union

from attrdict import AttrDict
import audiosegment
import dataclasses
from dataclasses import dataclass
import numpy as np
import pandas as pd
from potoo.pandas import df_remove_unused_categories, df_reorder_cols

from util import DataclassUtil

Audio = audiosegment.AudioSegment


@dataclass
class Species(DataclassUtil):
    sci_name: str
    com_name: str
    taxon_id: str
    species_code: str
    taxon_order: str
    com_name_codes: Iterable[str]
    sci_name_codes: Iterable[str]
    banding_codes: Iterable[str]
    shorthand: str
    longhand: str


@dataclass
class Recording(DataclassUtil):

    # Required (1/2)
    dataset: str

    # Metadata
    #   - Optional, for partial load
    species: str = None
    species_com_name: str = None
    species_query: str = None
    duration_s: float = None
    samples_mb: float = None
    samples_n: int = None
    basename: str = None
    species_longhand: str = None

    # Required (2/2)
    #   - Located down here so that df display puts it far to the right
    #   - Defaulted to None because dataclass non-default args can't come after default args
    id: str = None
    path: str = None
    filesize_b: int = None

    # Data
    #   - Optional, for partial load
    audio: Audio = None

    # Features
    #   - Optional, for partial load
    spectro: np.ndarray = None
    patches: Iterable[np.ndarray] = None
    feats: np.ndarray = None


def RecordingDF(*args, **kwargs) -> pd.DataFrame:
    import metadata  # Lazy import to avoid recursive module load
    cat_cols = {
        'species': 'shorthand',
        'species_com_name': 'com_name',
        'species_longhand': 'longhand',
    }
    return (
        pd.DataFrame(*args, **kwargs)
        # Map str -> category for cols that have category dtypes available
        .pipe(lambda df: (df
            .assign(**{
                rec_k: df[rec_k].astype('str').astype(metadata.species.df[species_k].dtype)
                for rec_k, species_k in cat_cols.items()
                if rec_k in df
            })
        ))
        # Order cols like Recording fields
        .pipe(df_reorder_cols, first=[x.name for x in dataclasses.fields(Recording)])
        # Drop null cols, so downstream usage can assume that present cols are meaningful
        .dropna(axis=1)
        # Drop unused cats to avoid surprising big/slow behaviors when many cats are unused
        .pipe(df_remove_unused_categories)
    )


RecOrAudioOrSignal = Union[
    Recording,  # rec as Recording
    dict,  # rec as AttrDict
    Audio,  # audio
    Tuple[np.array, int],  # (x, sample_rate)
    np.array,  # x where sample_rate=standard_sample_rate_hz
]
