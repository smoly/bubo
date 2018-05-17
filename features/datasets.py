from collections import OrderedDict
from functools import lru_cache
import re

import pandas as pd

from constants import data_dir, unk_species
import metadata
from util import df_reorder_cols, singleton

datasets = {
    'recordings': 'recordings/*',
    'recordings-new': 'recordings-new/*',
    'peterson-field-guide': 'peterson-field-guide/*/audio/*',
    'birdclef-2015': 'birdclef-2015/organized/wav/*',
    'warblrb10k': 'dcase-2018/warblrb10k_public_wav/*',
    'ff1010bird': 'dcase-2018/ff1010bird_wav/*',
    'nips4b': 'nips4b/all_wav/*',
    'mlsp-2013': 'mlsp-2013/mlsp_contest_dataset/essential_data/src_wavs/*',
}


def metadata_from_audio(dataset, audio) -> dict:
    name = audio.name
    name_parts = name.split('/')
    basename = name_parts[-1]
    species = None
    species_query = None
    if dataset == 'peterson-field-guide':
        species_query = name.split('/')[1]
    elif dataset == 'recordings-new':
        m = re.match(r'^([A-Z]{4}) ', basename)
        if m: species_query = m.groups()[0]
    elif dataset == 'mlsp-2013':
        # TODO Generalize species[species_query] to work on multi-label species (e.g. 'SOSP,WIWA')
        #   - Works fine for now because it passes through queries it doesn't understand, and these are already codes
        train_labels = mlsp2013.train_labels_for_filename.get(
            basename,
            [unk_species],  # If missing it's an unlabeled test rec
        )
        species = 'none' if train_labels == [] else ','.join(sorted(train_labels))
        # TODO What did 'XXXX' vs. 'none' mean here? [see inspect_dataset_mlsp-2013.ipynb]
    return OrderedDict(
        dataset=dataset,
        species=species or metadata.species[species_query, 'shorthand'] or unk_species,
        species_query=species_query,
        basename=basename,
        name=audio.name,
    )


@singleton
class mlsp2013:

    def __init__(self):
        self.dir = f'{data_dir}/mlsp-2013'

    @property
    @lru_cache()
    def labels(self):
        pass

    @property
    @lru_cache()
    def rec_id2filename(self):
        return pd.read_csv(f'{self.dir}/mlsp_contest_dataset/essential_data/rec_id2filename.txt')

    @property
    @lru_cache()
    def sample_submission(self):
        return pd.read_csv(f'{self.dir}/mlsp_contest_dataset/essential_data/sample_submission.csv')

    @property
    @lru_cache()
    def species_list(self):
        return pd.read_csv(f'{self.dir}/mlsp_contest_dataset/essential_data/species_list.txt')

    @property
    @lru_cache()
    def rec_labels_test_hidden(self):
        # Has variable numbers of columns (multiple labels per rec_id), so parse it manually
        with open(f'{self.dir}/mlsp_contest_dataset/essential_data/rec_labels_test_hidden.txt') as f:
            return (
                pd.DataFrame(line.rstrip().split(',', 1) for line in f.readlines())
                .T.set_index(0).T  # Pull first row into df col names
            )

    @property
    def test_recs(self):
        return self.rec_labels_test_hidden[lambda df: df['[labels]'] == '?'][['rec_id']]

    @property
    def _train_labels_raw(self):
        return self.rec_labels_test_hidden[lambda df: df['[labels]'] != '?']

    @property
    @lru_cache()
    def train_labels(self):
        return (self._train_labels_raw
            .astype({'rec_id': 'int'})
            .fillna({'[labels]': '-1'})
            .set_index('rec_id')['[labels]']
            .map(lambda s: [int(x) for x in s.split(',') if x != ''])
            .apply(pd.Series).unstack()  # flatmap
            .reset_index(level=0, drop=True)  # Drop 'level' index
            .sort_index().reset_index()  # Sort and reset 'rec_id' index
            .rename(columns={0: 'class_id'})
            .dropna()
            .merge(self.species_list, how='left', on='class_id').drop(columns=['class_id'])
            .merge(self.rec_id2filename, how='left', on='rec_id')
            .pipe(df_reorder_cols, first=['rec_id', 'filename'])
        )

    @property
    @lru_cache()
    def train_labels_for_filename(self) -> dict:
        return (mlsp2013.train_labels
            .groupby('filename')['code']
            .apply(lambda s: [x for x in s if pd.notnull(x)])
            .pipe(dict)
        )
