import logging

log = logging.getLogger(__name__)


## features.sp14

import matplotlib as mpl
from skm import SKM


def cart_to_polar(x, y):
    z = x + y * 1j
    return (np.abs(z), np.angle(z))


def polar_to_cart(r, theta):
    z = r * np.exp(1j * theta)
    return (z.real, z.imag)


# A more plt friendly version of skm.display.visualize_clusters
def skm_visualize_clusters(skm: SKM, X, cmap=mpl.cm.Set1):
    """Visualize the input data X and cluster assignments from SKM model skm"""
    assert skm.assignment is not None
    if skm.do_pca:
        X = skm.pca.transform(X.T).T  # Whiten data to match centroids
    plt.axhline(0, color='lightgray')
    plt.axvline(0, color='lightgray')
    color_i = mpl.cm.ScalarMappable(
        cmap=cmap,
        norm=mpl.colors.Normalize(vmin=0, vmax=skm.k - 1),
    ).to_rgba
    for n, sample in enumerate(X.T):
        plt.plot(sample[0], sample[1], '.', color=color_i(skm.assignment[n]))
    for n, centroid in enumerate(skm.D.T):
        plt.plot(centroid[0], centroid[1], 'o', color=color_i(n), markersize=8, markeredgewidth=2, markeredgecolor='k')
    # Set square lims (because polar)
    max_lim = max([*plt.gca().get_xlim(), *plt.gca().get_ylim()])
    plt.xlim(-abs(max_lim), abs(max_lim))
    plt.ylim(-abs(max_lim), abs(max_lim))


## features

from collections import OrderedDict
from functools import lru_cache
import re
from typing import Any, NewType, Optional, Tuple, Union

import attr
import audiosegment
from functools import partial
import librosa
import matplotlib as mpl
import numpy as np
import pandas as pd
import pydub
import scipy

from constants import cache_dir, data_dir
import metadata

standard_sample_rate_hz = 22050  # Can resolve 11025Hz (by Nyquist), which most/all birds are below
default_log_ylim_min_hz = 512  # Most/all birds are above 512Hz (but make sure to clip noise below 512Hz)

Recording = attr.make_class('Recording', ['name', 'source', 'species', 'species_query', 'basename', 'audio', 'samples'])
RecOrAudioOrSignal = Union[
    Recording,  # rec as Recording/attrs
    dict,  # rec as dict
    audiosegment.AudioSegment,  # audio
    Tuple[np.array, int],  # (x, sample_rate)
    np.array,  # x where sample_rate=standard_sample_rate_hz
]


def load_audio(
    path: str,
    cache: bool = True,
    channels: int = 1,
    sample_rate: int = standard_sample_rate_hz,
    sample_width_bit: int = 16,
    verbose: bool = False,
) -> audiosegment.AudioSegment:
    """
    Load an audio file, and (optionally) cache a standardized .wav for faster subsequent loads
    """

    _print = print if verbose else lambda *args, **kwargs: None
    if not cache:
        audio = audiosegment.from_file(path)
    else:

        rel_path_noext, _ext = os.path.splitext(os.path.relpath(path, data_dir))
        params_id = f'{sample_rate}hz-{channels}ch-{sample_width_bit}bit'
        cache_path = f'{cache_dir}/{params_id}/{rel_path_noext}.wav'
        if not os.path.exists(cache_path):
            _print(f'Caching: {cache_path}')
            in_audio = audiosegment.from_file(path)
            std_audio = in_audio.resample(
                channels=channels,
                sample_rate_Hz=sample_rate,
                sample_width=sample_width_bit // 8,
            )
            std_audio.export(ensure_parent_dir(cache_path), 'wav')
        # Always load from disk, for consistency
        audio = audiosegment.from_file(cache_path)

    # HACK Make audiosegment.AudioSegment attrs more ergonomic
    audio = audiosegment_std_name(audio)

    return audio


def audiosegment_std_name(
    audio: audiosegment.AudioSegment,
    data_dir=data_dir,
    cache_dir=cache_dir,
) -> audiosegment.AudioSegment:
    """Make audiosegment.AudioSegment attrs more ergonomic"""
    audio = audiosegment.AudioSegment(audio.seg, audio.name)
    # Save the full path
    audio.path = audio.name
    # More ergonomic .name (which is never used as a path)
    if audio.path.startswith(cache_dir):
        # Relative cache path, excluding the leading 'hz=...,ch=...,bit=.../' dir
        name = os.path.relpath(audio.path, cache_dir).split('/', 1)[1]
    else:
        # Else relative data path
        name = os.path.relpath(audio.path, data_dir)
    # Extensions are boring
    name, _ext = os.path.splitext(name)
    audio.name = name
    return audio


def unpack_rec(rec_or_audio_or_signal: RecOrAudioOrSignal) -> (
    Optional[Recording],  # rec if input was rec else None
    audiosegment.AudioSegment,  # audio
    np.array,  # x
    int,  # sample_rate
):
    """
    Allow user to pass in a variety of input types
    - Returns (rec, audio), where rec is None if no Recording was provided
    """
    v = rec_or_audio_or_signal
    rec = audio = x = sample_rate = None

    # rec as Recording/attrs
    if not isinstance(v, (dict, audiosegment.AudioSegment, np.ndarray, tuple)):
        v = {a.name: getattr(v, a.name) for a in Recording.__attrs_attrs__}

    # rec as dict
    if isinstance(v, dict):
        rec = Recording(**v)
    # audio
    elif isinstance(v, audiosegment.AudioSegment):
        audio = v
    # (x, sample_rate)
    elif isinstance(v, tuple):
        (x, sample_rate) = v
    # x where sample_rate=standard_sample_rate_hz
    elif isinstance(v, np.ndarray):
        (x, sample_rate) = (v, standard_sample_rate_hz)

    audio = (
        rec.audio if rec else
        audio if audio is not None else  # Careful: bool(audiosegment.AudioSegment) isn't reliable for ~0s audios
        audiosegment.from_numpy_array(x, framerate=sample_rate)
    )
    x = audio.to_numpy_array()
    sample_rate = audio.frame_rate

    if sample_rate != standard_sample_rate_hz:
        log.warn(f'Nonstandard sample_rate[{sample_rate}] != standard[{standard_sample_rate_hz}] for audio[{audio}]')

    return (rec, audio, x, sample_rate)


def plt_audio_signal(audio: audiosegment.AudioSegment, **kwargs):
    plt_signal(audio.to_numpy_array(), audio.frame_rate, **kwargs)
    plt.gca().xaxis.set_major_formatter(mpl.ticker.FormatStrFormatter('%ds'))


class HasPlotAudioTF:

    def _plot_audio_tf(
        self,
        powscale=lambda x: x,
        yscale='linear',
        ylim=None,  # Hz
        cmap=None,
        ax=None,
        fancy=True,
        show_audio=True,
        show_marginals=True,
        show_title=True,
        show_spines=False,
        xformat=lambda x: '%ds' % x,
        yformat=lambda y: '%.0fKiHz' % int(y / 1024),
        # yformat=lambda y: '%.0fHz' % y,
        fontsize=10,
        labelsize=8,
        **kwargs,
    ):

        assert not (fancy and ax), f"Can't supply both fancy[{fancy}] and ax[{ax}]"

        if fancy and show_marginals:
            fig = plt.figure()
            gs = mpl.gridspec.GridSpec(nrows=2, ncols=2, width_ratios=[30, 1], height_ratios=[1, 8], wspace=0, hspace=0)
        else:
            # Don't interfere with the existing figure/axis
            fig = None
            gs = None

        # Setup plot for time-freq spectro (big central plot)
        if fancy:
            ax_tf = fig.add_subplot(gs[-1, 0])
        else:
            ax_tf = ax or plt.gca()

        # Unpack attrs
        rec = self.rec
        audio = self.audio
        (f, t, S) = self  # Delegate to __iter__, e.g. for Mfcc

        # Scale S power, if requested
        S = powscale(S)

        # Compute marginals
        S_f = S.mean(axis=1)
        S_t = S.mean(axis=0)

        # Plot time-freq spectro (big central plot)
        ax_tf.pcolormesh(
            # Extend (t,f) by one element each to avoid dropping the last row and col from S (fence-post problem)
            #   - https://matplotlib.org/api/_as_gen/matplotlib.pyplot.pcolor.html
            list(t) + [t[-1] + (t[-1] - t[-2])], list(f) + [f[-1] + (f[-1] - f[-2])],
            S,
            cmap=cmap,
        )
        if yscale:
            yscale = yscale if isinstance(yscale, dict) else dict(value=yscale)
            ax_tf.set_yscale(**yscale)
        if ylim:
            ax_tf.set_ylim(ylim)
        if labelsize:
            ax_tf.tick_params(labelsize=labelsize)
        if not show_spines:
            [s.set_visible(False) for s in ax_tf.spines.values()]

        if fancy and show_marginals:

            # Marginal time (top edge)
            ax_t = fig.add_subplot(gs[0, 0])
            ax_t.step(t, S_t, 'k', linewidth=.5)
            ax_t.set_xlim(t[0], t[-1])  # (Off by one, but good enough) [repro: try plt.step with few y bins]
            # ax_t.set_ylim(S_t.min(), S_t.max())  # Makes the highest bar edge disappear
            ax_t.set_xticks([])
            ax_t.set_yticks([])
            ax_t.axis('off')

            # Marginal freq (right edge)
            ax_f = fig.add_subplot(gs[-1, -1])
            ax_f.plot(S_f, f, 'k', linewidth=.5)
            ax_f.set_ylim(f[0], f[-1])  # (Off by one, but good enough) [repro: try plt.step with few y bins]
            # ax_f.set_xlim(S_f.min(), S_f.max())  # Makes the highest bar edge disappear
            if yscale:
                # ax_f.set_yscale(ax_tf.get_yscale())  # Doesn't work, use **yscale instead
                ax_f.set_yscale(**yscale)
            ax_f.set_xticks([])
            ax_f.set_yticks([])
            ax_f.axis('off')

            # Match lims across marginal time/freq plots
            [ax_t_min, ax_t_max] = ax_t.get_ylim()
            [ax_f_min, ax_f_max] = ax_f.get_xlim()
            ax_t_f_lim = [min(ax_t_min, ax_f_min), max(ax_t_max, ax_f_max)]
            ax_t.set_ylim(ax_t_f_lim)
            ax_f.set_xlim(ax_t_f_lim)

        if fancy and show_title and rec:
            # Put title at the bottom (as ax_tf xlabel) because fig.suptitle messes up vspacing with different figsizes
            ax_tf.set_xlabel(f'{rec.source}/{rec.species}/{rec.basename}', fontsize=fontsize)
            # fig.suptitle(f'{rec.source}/{rec.species}/{rec.basename}', fontsize=fontsize)  # XXX Poop on this

        if xformat: ax_tf.xaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda x, pos=None: xformat(x)))
        if yformat: ax_tf.yaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda y, pos=None: yformat(y)))

        if fancy and show_audio:
            plt.show()  # Flush plot else audio displays first
            display(audio)


class Spectro(HasPlotAudioTF):

    def __init__(
        self,
        rec_or_audio_or_signal,
        nperseg=1024,  # Samples per stft segment
        overlap=0.75,  # Fraction of nperseg samples that overlap between segments
        **kwargs,  # Passthru to scipy.signal.spectrogram
    ):
        """
        Compute the (real, power) spectrogram of an audio signal
        - spectro(x) = |STFT(x)|**2
        - Real (|-|), not complex (because humans can't hear complex phase)
        - Power (**2), not energy

        Creates attributes:
        - f: freq indexes (Hz)
        - t: time indexes (s)
        - S: power (f x t): X**2 where X is the (energy) unit of the audio signal
        with shapes:
        - f: len(f) ≈ nperseg/2
        - t: len(t) ≈ len(x)/stride, where stride = nperseg*(1-overlap)
        - S: S.shape = (len(f), len(t))
        """

        (rec, audio, x, sample_rate) = unpack_rec(rec_or_audio_or_signal)
        (f, t, S) = scipy.signal.spectrogram(x, sample_rate, **{
            'window': 'hann',
            'nperseg': nperseg,
            'noverlap': int(overlap * nperseg),
            'scaling': 'spectrum',  # Return units X**2 ('spectrum'), not units X**2/Hz ('density')
            'mode': 'magnitude',  # Return |STFT(x)**2|, not STFT(x)**2 (because "humans can't hear complex phase")
            **kwargs,
        })

        # Capture env (e.g. self.S, self.audio, self.nperseg)
        self.__dict__.update(locals())

    def __iter__(self):
        """For unpacking, e.g. (f, t, S) = Spectro(...)"""
        return iter([self.f, self.t, self.S])

    def plot(self, **kwargs):
        self._plot_audio_tf(**{
            'powscale': np.log1p,  # Spectrogram (S) is defined as linear scale, but plot it as log scale by default
            **kwargs,
        })


class Melspectro(HasPlotAudioTF):

    def __init__(
        self,
        rec_or_audio_or_signal,
        nperseg=1024,  # Samples per stft segment
        overlap=0.75,  # Fraction of nperseg samples that overlap between segments [TODO Fix when < .5 (see below)]
        mels_div=2,  # Increase to get fewer freq bins (unsafe to decrease) [TODO Understand better]
        n_mels=None,  # Specify directly, instead of mels_div
        **kwargs,  # Passthru to scipy.signal.spectrogram
    ):
        """
        Compute the mel spectrogram of an audio signal:
        - Take the (normal) power spectrogram (i.e. S = |STFT(x)|**2)
        - Log-transform the freq axis from linear scale to (approximately) mel scale, using a mel filter bank
        - Log-transform the powers
        - (Optional) Subtract mean per freq band to reduce noise

        Creates attributes:
        - f: freq indexes (Hz), mel-scaled
        - t: time indexes (s)
        - S: log power (f x t): log(X**2) where X is the (energy) unit of the audio signal
        with shapes:
        - f: len(f) ≈ n_mels or nperseg/2/mels_div
        - t: len(t) ≈ len(x)/hop_length, where hop_length = nperseg*(1-overlap)
        - S: S.shape = (len(f), len(t))

        When to use melspectro vs. mfcc (from [2]):
        - "tl;dr: Use Mel-scaled filter banks [i.e. melspectro] if the machine learning algorithm is not susceptible to
          highly correlated input. Use MFCCs if the machine learning algorithm is susceptible to correlated input."

        References:
        1. https://en.wikipedia.org/wiki/Mel-frequency_cepstrum
        2. http://haythamfayek.com/2016/04/21/speech-processing-for-machine-learning.html
        3. §12.5.7 of "Text-to-Speech Synthesis" (2009) [https://books.google.com/books?isbn=0521899273]
        """

        (rec, audio, x, sample_rate) = unpack_rec(rec_or_audio_or_signal)

        # TODO Why do we match librosa.feature.melspectrogram when overlap>=.5 but not <.5?
        if overlap < .5:
            log.warn(f"Melspectro gives questionable output when overlap[{overlap}] < .5 (i.e. doesn't match librosa)")

        # Normal spectro
        (f, t, S) = Spectro(audio, **{
            'nperseg': nperseg,
            'overlap': overlap,
            'scaling': 'spectrum',
            'mode': 'magnitude',
            **kwargs,
        })

        # HACK Apply unknown transforms to match librosa.feature.melspectrogram
        #   - TODO Figure out why these are required to match output
        #   - And keep in mind that we currently match only when overlap>=.5 but not <.5
        S = S * (nperseg // 2)  # No leads on this one...
        S = S**2  # Like energy->power, but spectro already gives us power instead of energy...

        # Linear freq -> mel-scale freq
        n_mels = n_mels or nperseg // 2 // mels_div  # TODO mels_div should depend on sample_rate [assumes default rate]
        mel_basis = librosa.filters.mel(sample_rate, n_fft=nperseg, n_mels=n_mels)
        S = np.dot(mel_basis, S)

        # Linear power -> log power
        S = librosa.power_to_db(S)

        # Mel-scale f to match S[i]
        f = librosa.mel_frequencies(n_mels, f.min(), f.max())

        # Capture env (e.g. self.S, self.audio, self.nperseg)
        self.__dict__.update(locals())

    def __iter__(self):
        """For unpacking, e.g. (f, t, S) = Melspectro(...)"""
        return iter([self.f, self.t, self.S])

    def plot(self, **kwargs):
        self._plot_audio_tf(**{
            # Mel-scale the y-axis
            #   - Required even though Melspectro already mel-scales the S freq axis, else plt scales it back to linear
            #   - https://matplotlib.org/api/_as_gen/matplotlib.axes.Axes.set_yscale.html#matplotlib.axes.Axes.set_yscale
            #   - https://matplotlib.org/api/_as_gen/matplotlib.pyplot.yscale.html
            'yscale': dict(value='symlog', basey=2, linthreshy=1024, linscaley=.5),
            **kwargs,
        })


# TODO Basically works, but I left some loose ends
class Mfcc(HasPlotAudioTF):

    def __init__(
        self,
        rec_or_audio_or_signal,
        nperseg=1024,  # Samples per stft segment
        overlap=0.75,  # Fraction of nperseg samples that overlap between segments
        mels_div=2,  # Increase to get fewer freq bins (unsafe to decrease) [TODO Understand better]
        first_n_mfcc=None,  # Default: all mfcc's (= len(f) = nperseg/2/mels_div)
        std=True,  # Whether to standardize the quefrency slices (rows) of M
        dct_type=2,  # TODO librosa uses 2 (FT) but isn't 3 (IFT) more technically correct?
        dct_norm='ortho',
        **kwargs,  # Passthru to scipy.signal.spectrogram
    ) -> (
        'q',  # quefrency indexes (s)
        't',  # time indexes (s)
        'M',  # [What are the units here?]
    ):
        """
        Compute the MFCCs of an audio signal:
        - Take the mel spectrogram (i.e. S = melspectro(x))
        - Map each time's spectrum to a cepstrum by taking the IDCT (inverse DCT, i.e. DCT type 3), as if it were a signal
        - (Optional) Subtract mean per coefficient to reduce noise

        Returns:
        - S.shape = (len(q), len(t))
        - len(t) ≈ len(x)/stride, where stride = nperseg*(1-overlap)
        - len(q) ≈ first_n_mfcc, else nperseg/2/mels_div

        When to use melspectro vs. mfcc (from [2]):
        - "tl;dr: Use Mel-scaled filter banks [i.e. melspectro] if the machine learning algorithm is not susceptible to
          highly correlated input. Use MFCCs if the machine learning algorithm is susceptible to correlated input."

        References:
        1. https://en.wikipedia.org/wiki/Mel-frequency_cepstrum
        2. http://haythamfayek.com/2016/04/21/speech-processing-for-machine-learning.html
        3. §12.5.7 of "Text-to-Speech Synthesis" (2009) [https://books.google.com/books?isbn=0521899273]
        """
        (rec, audio, x, sample_rate) = unpack_rec(rec_or_audio_or_signal)

        (f, t, S) = Melspectro(audio, **{
            'nperseg': nperseg,
            'overlap': overlap,
            'mels_div': mels_div,
            **kwargs,
        })

        if first_n_mfcc is None:
            first_n_mfcc = len(f)

        # M = np.dot(librosa.filters.dct(first_n_mfcc, len(f)), S)  # XXX
        M = scipy.fftpack.dct(S, axis=0, type=dct_type, norm=dct_norm)[:first_n_mfcc]
        # Quefrency units are time (lag?) with values 1/f
        #   - http://rug.mnhn.fr/seewave/HTML/MAN/ceps.html -- does just 1/f
        #   - http://azimadli.com/vibman/cepstrumterminology.htm
        #   - TODO But how do we encode them without making plt.pcolormesh scale non-linearly? Stick with arange for now...
        #       - Use plt.imshow instead of plt.pcolormesh? imshow works with plt.show(), it doesn't replace it
        #           - https://matplotlib.org/tutorials/introductory/images.html
        #           - https://matplotlib.org/gallery/images_contours_and_fields/contour_image.html
        #           - https://matplotlib.org/api/_as_gen/matplotlib.pyplot.imshow.html
        # q = f[:first_n_mfcc]
        q = np.arange(first_n_mfcc)

        # Standardize: (x - μ) / σ
        if std:
            M = (M - M.mean(axis=1)[:, np.newaxis]) / M.std(axis=1)[:, np.newaxis]

        # Capture env (e.g. self.M, self.audio, self.nperseg)
        self.__dict__.update(locals())

    def __iter__(self):
        """For unpacking, e.g. (q, t, M) = Mfcc(...)"""
        return iter([self.q, self.t, self.M])

    def plot(self, **kwargs):
        self._plot_audio_tf(**{
            # Mel-scale the y-axis
            #   - Required even though Melspectro already mel-scales the S freq axis, else plt scales it back to linear
            #   - https://matplotlib.org/api/_as_gen/matplotlib.axes.Axes.set_yscale.html#matplotlib.axes.Axes.set_yscale
            #   - https://matplotlib.org/api/_as_gen/matplotlib.pyplot.yscale.html
            'yscale': dict(value='symlog', basey=2, linthreshy=1024, linscaley=.5),
            # TODO Figure out correct values/labels for y-axis (see comments above)
            'yformat': lambda y: y,
            **kwargs,
        })


# TODO
def plt_compare_spec_mel_mfcc(rec_or_audio_or_signal):

    Spectro(rec_or_audio_or_signal).plot(show_audio=False)
    plt.show()

    Melspectro(rec_or_audio_or_signal).plot(show_audio=False)
    plt.show()

    Mfcc(rec_or_audio_or_signal).plot(show_audio=False)
    plt.show()

    (rec, audio, x, sample_rate) = unpack_rec(rec_or_audio_or_signal)
    mfccs = librosa.feature.mfcc(x.astype(float), sample_rate, n_mfcc=4)
    for i in range(mfccs.shape[0]):
        mfccs[i] = (mfccs[i] - mfccs[i].mean()) / mfccs[i].std()
    plt.pcolormesh(mfccs)
    plt.gca().yaxis.set_major_formatter(mpl.ticker.FormatStrFormatter('%9d'))  # Hack to align x-axis with spectro
    plt.show()


# TODO Eventually
def ambiguity_function_via_spectro(x):
    """
    A fast ambiguity function for signal x via 2D-FT on its (STFT) spectrogram:
        A_x(ν,τ) = FT_{t->ν}(IFT_{τ<-f}(S_x(t,f)))

    This approach mimics QTFD relationship between the ambiguity function and WVD, which is slow to compute:
        A_z(ν,τ) = FT_{t->ν}(IFT_{τ<-f}(W_z(t,f)))
    """
    pass  # TODO WIP in plot_a_few_tfds.ipynb


## matplotlib

import matplotlib.pyplot as plt
import numpy as np


def plt_signal(y: np.array, x_scale: float = 1, show_ydtype=False, show_yticks=False):
    # Performance on ~1.1M samples:
    #   - ggplot+geom_line / qplot is _really_ slow (~30s)
    #   - df.plot is decent (~800ms)
    #   - plt.plot is fastest (~550ms)
    plt.plot(
        np.arange(len(y)) / x_scale,
        y,
    )
    if not show_yticks:
        # Think in terms of densities and ignore the scale of the y-axis
        plt.yticks([])
    if show_ydtype:
        # But show the representation dtype so the user can stay aware of overflow and space efficiency
        plt.ylabel(y.dtype.type.__name__)
        if np.issubdtype(y.dtype, np.integer):
            plt.ylim(np.iinfo(y.dtype).min, np.iinfo(y.dtype).max)


## pandas

import time
from typing import List

import pandas as pd


def df_reorder_cols(df: pd.DataFrame, first: List[str] = [], last: List[str] = []) -> pd.DataFrame:
    first_last = set(first) | set(last)
    return df.reindex(columns=first + [c for c in df.columns if c not in first_last] + last)


def df_apply_with_progress(df, f, update_s=5, show_row=True, **kwargs):
    """
    Example usage:
        df.pipe(df_apply_with_progress, update_s=30, f=lambda row:
            ...  # Transform row
        ))
    """

    n = len(df)
    start_s = time.time()
    last_updated_at_s = [start_s]  # Put in a ref cell (f'ing python scope)

    def _print(i, row):
        elapsed_s = time.time() - start_s
        rate = i / elapsed_s
        print('Progress[%s/%s, %s, %s]%s' % (
            i,
            n,
            '%s/s' % ('...' if i == 0 else '%.3g' % rate),
            (
                'took %.3gs' % elapsed_s if i == n else
                'ETA %s' % ('...' if i == 0 else '%.3gs' % ((n - i) / rate))
            ),
            '' if row is None or not show_row else ': %s' % row.to_dict(),
        ))

    def g(row):
        i = row.name
        if any([
            i == 0,
            update_s is not None and time.time() - last_updated_at_s[0] > update_s,
        ]):
            last_updated_at_s[0] = time.time()
            _print(i, row)
        return f(row)

    out_df = df.apply(axis=1, func=g, **kwargs)
    _print(n, row=None)
    return out_df


## unix

import os


def ls(dir):
    return [
        os.path.join(dir, filename)
        for filename in os.listdir(dir)
    ]


## util

from functools import wraps
import os
import pickle
import random
import shlex


def shuffled(xs: iter, random=random) -> list:
    xs = list(xs)  # Avoid mutation + unroll iters
    random.shuffle(xs)
    return xs


def flatten(xss: iter) -> iter:
    return (x for xs in xss for x in xs)


def round_sig(x, n):
    return type(x)(f'%.{n}g' % x)


def generator_to(agg):
    def decorator(f):
        @wraps(f)
        def g(*args, **kwargs):
            return agg(f(*args, **kwargs))
        return g
    return decorator


def ensure_parent_dir(path):
    mkdir_p(os.path.dirname(path))
    return path


def mkdir_p(path):
    os.system('mkdir -p %s' % shlex.quote(path))


def puts(x):
    print(x)
    return x


def singleton(cls):
    """Class decorator"""
    return cls()


# TODO Add some sort of automatic invalidation. To manually invalidate, just go delete the file you specified.
def cache_to_file_forever(path):
    def decorator(f):
        def g(*args, **kwargs):
            try:
                with open(ensure_parent_dir(path), 'rb') as fd:
                    return pickle.load(fd)
            except:
                x = f(*args, **kwargs)
                with open(ensure_parent_dir(path), 'wb') as fd:
                    pickle.dump(x, fd)
                return x
        return g
    return decorator
