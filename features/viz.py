import itertools
from typing import Callable, Iterable, Optional, Union

import matplotlib.pyplot as plt
from more_itertools import first
import numpy as np
from potoo.pandas import df_transform_index
from potoo.plot import *
from potoo.util import round_sig
import scipy

import metadata
from util import *


def plot_thumbnail_micro(
    rec,
    features,
    plot_kwargs=dict(),
    **thumbnail_kwargs,
):
    plot_spectro_micro(
        rec_thumbnail(rec, features, **thumbnail_kwargs),
        features,
        **plot_kwargs,
    )


def plot_thumbnail(
    rec,
    features,
    raw=True,
    scale=None,
    audio=False,
    plot_kwargs=dict(),
    **thumbnail_kwargs,
):
    plot_spectro(
        rec_thumbnail(rec, features, **thumbnail_kwargs),
        raw=raw,
        scale=scale,
        audio=audio,
        **plot_kwargs,
    )


def plot_spectro_micro(
    rec,
    features,
    wrap=False,  # True to plot the full duration with wrapping
    wrap_s=10,  # TODO 10 vs. 15 as sane default?
    limit_s=None,
    **kwargs,
):
    kwargs.setdefault('raw', True)
    kwargs.setdefault('audio', False)
    if not wrap and not limit_s:
        limit_s = wrap_s
    if limit_s:
        rec = features.slice_spectro(rec, 0, limit_s)
    plot_spectro_wrap(rec, features, wrap_s=wrap_s, **kwargs)


def plot_spectro_wrap(
    rec,
    features,  # TODO Reimpl so we don't need features: slice up spectro.S instead of re-spectro'ing audio slices
    wrap_s: float = 10,  # Sane default (5 too small, 20 too big, 10/15 both ok)
    pad=True,  # In case there's only one line, pad out to wrap_s, e.g for uniform height when raw=True
    audio=False,
    raw=False,
    **kwargs,
):
    n_wraps = int(np.ceil(rec.duration_s / wrap_s))
    breaks_s = np.linspace(0, n_wraps * wrap_s, n_wraps, endpoint=False)
    if pad:
        kwargs['limit_s'] = wrap_s
    plot_spectros(
        pd.DataFrame(
            features.slice_spectro(rec, b, b + wrap_s)
            for b in breaks_s
        ),
        yticks=['%.0fs' % s for s in breaks_s],
        xformat=lambda s: '+%.0fs' % s,
        raw=raw,
        **kwargs,
    )
    if audio:
        if not raw:
            plt.show()
        display(rec.audio.unbox)


def plot_spectro(
    rec,
    raw=False,
    audio=False,
    **kwargs,
):
    plot_spectros(pd.DataFrame([rec]), raw=raw, **kwargs)
    if audio:
        if not raw:
            plt.show()
        display(rec.audio.unbox)


def plot_spectros(
    recs,
    query_and_title=None,
    raw=False,
    xformat=lambda x: '%.0fs' % x,
    ytick_col=None,  # e.g. 'species_longhand'
    yticks=None,
    limit_s='auto',  # Limit duration of x-axis
    n=None,
    verbose=False,
    **kwargs,
):
    """Vis lots of spectros per dataset"""

    if query_and_title:
        recs = recs.query(query_and_title)

    (Ss, ts) = (recs
        .pipe(lambda df: df.query(query_and_title) if query_and_title else df)
        [:n]
        .pipe(lambda df: (
            df.spectro.map(lambda s: s.S),
            df.spectro.map(lambda s: s.t),
        ))
    )
    if limit_s == 'auto':
        limit_s = recs.duration_s.max()
    dt = ts.iloc[0][1] - ts.iloc[0][0]  # Not exactly right, but close enough
    limit_i = int(round(limit_s / dt))
    f_i_len = Ss.iloc[0].shape[0]
    Ss = Ss.map(lambda S: S[:, :limit_i])
    ts = ts.map(lambda t: t[:limit_i])
    pad_first = np.array([[0, 0], [0, 0]])  # [top, bottom], [left, right]
    pad_rest  = np.array([[0, 1], [0, 0]])  # [top, bottom], [left, right]
    # Flip vertically (twice) to align with plt.imshow(..., origin='lower')
    cat_Ss = np.flip(axis=0, m=np.concatenate([
        np.flip(axis=0, m=np.pad(
            S,
            (pad_first if i == 0 else pad_rest) + np.array([[0, 0], [0, limit_i - S.shape[1]]]),
            'constant',
            constant_values=np.nan,
        ))
        for i, S in enumerate(Ss)
    ]))
    if verbose:
        print(f'cat_Ss.shape[{cat_Ss.shape}]')

    if raw:
        # Output image resolution is 1-1 with input array shape, but we can't add axis labels and figure titles
        raw_kwargs = {
            **(raw if isinstance(raw, dict) else {}),  # New api (simpler to compose)
            **kwargs,  # Back compat
        }
        show_img(cat_Ss, origin='lower', file_prefix=query_and_title or 'image', **raw_kwargs)
    else:
        # (imshow is faster than pcolormesh by ~4x)
        plt.imshow(cat_Ss, origin='lower')
        plt.gca().xaxis.set_major_formatter(mpl.ticker.FuncFormatter(lambda t_i, pos=None: xformat(t_i * dt)))
        if query_and_title:
            plt.title(query_and_title, loc='left')
        if not ytick_col and yticks is None:
            plt.yticks([])
        else:
            if yticks is None:
                yticks = list(recs[ytick_col])
            plt.yticks(
                np.arange(len(recs)) * (f_i_len + pad_rest[0].sum()) + f_i_len // 2,
                # Reverse to align with plt.imshow(..., origin='lower')
                reversed(yticks),
            )


def plot_patches(patches, f_bins, patch_length, raw=False, rows=None, sort={}, **kwargs):
    """Viz a set of patches (f*p, n) as a grid that matches figsize"""

    # Dimensions
    f = f_bins
    p = patch_length
    (fp, n) = patches.shape
    assert fp == f * p, f'fp[{fp}] != f[{f}] * p[{p}], for patches.shape[{patches.shape}]'

    # Compute (rows, cols) for patch layout, based on figsize (w,h) and patch size (f,p)
    if not rows:
        width = get_figsize()['width']
        height = get_figsize()['height']
        rows = np.sqrt(n / ((f+1)/height / ((p+1)/width)))
        rows = max(1, int(np.floor(rows)))  # Arbitrary choice: floor (taller) vs. ceil (wider)
    cols = int(np.ceil(n / rows))

    # Unstack each patch: (f*p, n) -> (n,f,p)
    patches = np.moveaxis(patches.reshape(f, p, n), 2, 0)

    # Sort (optional)
    if sort:
        patches = np.array(sorted(patches, **sort))

    # Extend patches to complete the grid: n -> rows*cols
    patches = np.append(
        patches,
        np.full((rows * cols - n, f, p), np.nan),
        axis=0,
    )
    assert patches.shape == (rows * cols, f, p)

    # Wrap into a grid: (rows*cols, ...) -> (rows, cols, ...)
    patches = patches.reshape(rows, cols, f, p)
    assert patches.shape == (rows, cols, f, p)

    # Pad each patch with a 1px bottom/right border: (f,p) -> (f+1, p+1)
    patches = np.array([
        np.array([
            np.pad(
                patch,
                np.array([[0, 1], [0, 1]]),  # [top, bottom], [left, right]
                'constant',
                constant_values=np.nan,  # nan renders as white
            ) for patch in row
        ])
        for row in patches
    ])
    assert patches.shape == (rows, cols, f+1, p+1)

    # Paste everything into a 2D image
    image = np.pad(
        np.concatenate(
            np.concatenate(
                # Flip row axis for origin='lower' (below) so that patches read left->right, top->bottom
                np.flip(patches, axis=0),
                axis=1,
            ),
            axis=1,
        ),
        # Pad with a top/left border
        np.array([[1, 0], [1, 0]]),  # [top, bottom], [left, right]
        'constant',
        constant_values=np.nan,
    )
    assert image.shape == (1 + rows*(f+1), 1 + cols*(p+1))

    # Plot
    kwargs.setdefault('origin', 'lower')  # Run y-axis upward 0->f, not downward f->0
    if raw:
        show_img(image, **kwargs)
    else:
        plt.imshow(image, **kwargs)


def sort_species_confusion_matrix(
    df: pd.DataFrame,
    dtype=metadata.species.df.shorthand.dtype,
) -> pd.DataFrame:
    return (df
        .pipe(df_transform_index, lambda c: c.astype(dtype)).sort_index()
        .T.pipe(df_transform_index, lambda c: c.astype(dtype)).sort_index().T
    )


def plot_confusion_matrix(M: np.ndarray, classes: Iterable[str], **kwargs):
    plot_confusion_matrix_df(
        pd.DataFrame(M, columns=classes, index=classes),
        **kwargs,
    )


def plot_confusion_matrix_df(
    df: pd.DataFrame,
    title: str = None,
    title_y: float = 1.08,  # Fussy
    format: Optional[Union[str, Callable]] = lambda x: (('%s' % round_sig(x, 2)) if x < 1 else '%.1f' % x).lstrip('0') or '0',
    ylabel='y_true',
    xlabel='y_pred',
    marginals=True,
    normalize=True,
    raw=False,
    sort_df = sort_species_confusion_matrix,  # TODO Not our concern? Sure is convenient...
    **kwargs,
):
    """From http://scikit-learn.org/stable/auto_examples/model_selection/plot_confusion_matrix.html"""

    # Coerce format
    #   - TODO Skip the `for i, j` below if no format [have to default xticks/yticks to a sane default format]
    format = format or (lambda x: '')
    if isinstance(format, str):
        format = lambda x: str % x

    # Sort indexes and columns of matrix
    if sort_df:
        df = sort_df(df)

    # Data
    M = df.as_matrix()
    classes = list(df.index)
    if normalize:
        M = M.astype('float') / M.sum(axis=1)[:, np.newaxis]
        M = np.nan_to_num(M)

    # Add marginals to labels
    #   - Don't add them to grid, else their magnitude will drown out everything else
    xticks = classes
    yticks = classes
    if marginals:
        xticks = [' '.join([tick, '(%s)' % format(x)]) for tick, x in zip(xticks, M.sum(axis=0))]
        yticks = [' '.join(reversed([tick, '(%s)' % format(x)])) for tick, x in zip(yticks, M.sum(axis=1))]

    # Plot
    kwargs.setdefault('origin', 'upper')
    if raw:
        show_img(M, **kwargs)
    else:
        plt.imshow(M, interpolation='nearest', **kwargs)
        plt.gca().xaxis.tick_top()
        plt.gca().xaxis.set_label_position('top')
        plt.xticks(range(len(xticks)), xticks, rotation=90)
        plt.yticks(range(len(yticks)), yticks)
        plt.ylabel(ylabel)
        plt.xlabel(xlabel)
        if title:
            plt.title(title, y=title_y)
        plt.tight_layout()
        thresh = M.max() / 2.
        for i, j in itertools.product(range(M.shape[0]), range(M.shape[1])):
            plt.text(
                j,
                i,
                format(M[i,j]),
                horizontalalignment='center',
                color='white' if M[i,j] > thresh else 'black',
                # color='lightgray' if M[i,j] > thresh else 'darkgray',
                # color='gray',
            )


def plot_pca_var_pct(pca: 'sk.decomposition.PCA', filter_df=None) -> ggplot:
    return (
        pd.DataFrame(dict(var_pct=pca.explained_variance_ratio_))
        .reset_index()
        .assign(
            component=lambda df: df.index,
            cum_var_pct=lambda df: df.var_pct.cumsum(),
        )
        .pipe(lambda df: df[filter_df] if filter_df is not None else df)
        .pipe(ggplot)
        + aes(x='component')
        + geom_point(aes(y='var_pct'), fill='none')
        + geom_line(aes(y='var_pct'), alpha=.5)
        + geom_point(aes(y='cum_var_pct'), color='blue', fill='none')
        + geom_line(aes(y='cum_var_pct'), color='blue', alpha=.5)
        + scale_y_continuous(limits=(0, 1), breaks=np.linspace(0, 1, 10+1))
        + coord_flip()
        + theme_figsize(aspect=1/4)  # (Caller can override simply by adding another theme_figsize to the result)
    )


def plot_all_projections(
    df: pd.DataFrame,
    ndims: int,  # How many dimures to generate pairs for, e.g. ndims=4 -> [(0,1), (0,2), (0,3), (1,2), (1,3), (2,3)]
    dim_name: Union[str, Callable[[int], str]],  # Dimension column name in df, as a function of dimension index
    pack=False,  # Pack cells instead of leaving ~half blank
    diag_hack=False,  # Plot densities on the diagonal [TODO Make this less hacky and brittle]
    nrows: int = None,
    ncols: int = None,
    sharex=True,
    sharey=True,
    diag_kwargs=dict(),
    width: float = None,
    aspect: float = None,
    title_kwargs=dict(),
    suptitle=None,
    suptitle_top=.94,  # Manually adjust top margin for tight_layout + suptitle (ugh)
    lim=(-1, 1),  # HACK TODO FIXME How to make sns/plt compute this automatically from the data? (What did I obstruct?)
    xlim=None,
    ylim=None,
    **scatter_kwargs,
):
    """
    Similar in spirit to sns.pairplot, except:
    - Omit plots below the diagonal, for ~2x speedup
    - Allow sharex/sharey
    - Allow pack=True, for 2x visual density

    Example usage:

        plot_all_projections(
            df_pca,
            ndims=10,
            dim_name='x%s',
            hue='species',
            palette='tab10',
            pack=True,
        )

    Similar results from sns.pairplot, for reference:

        sns.pairplot(
            data=df_pca[['species', *[f'x{i}' for i in range(10)]]],
            hue='species',
            diag_kind='kde',
            markers='.',
            plot_kws=dict(
                linewidth=0,
                s=10,
            ),
            diag_kws=dict(
                shade=True,
                linewidth=1,
                alpha=.5,
            ),
        )

    """

    # Lazy import
    import seaborn as sns

    # Defaults
    scatter_kwargs.setdefault('marker', '.')  # Tiny markers
    scatter_kwargs.setdefault('s', 10) # plt 's' instead of sns 'size', else sns includes the single size value in the legend
    scatter_kwargs.setdefault('linewidth', 0)  # Don't draw edges around markers
    diag_kwargs = dict(diag_kwargs)  # Don't mutate
    diag_kwargs.setdefault('linewidth', 1)
    title_kwargs = dict(title_kwargs)  # Don't mutate
    title_kwargs.setdefault('fontsize', 8)
    if xlim is None: xlim = lim
    if ylim is None: ylim = lim

    # Interpret params
    if isinstance(dim_name, str):
        dim_name = lambda i, dim_name=dim_name: dim_name % i
    dim_pairs = [(a, b - 1) for a, b in combinations(range(ndims + 1), 2)]
    if not pack:
        nrows = nrows or ndims
        ncols = ncols or ndims
    elif not nrows and not ncols:
        ncols = int(np.ceil(np.sqrt(len(dim_pairs))))
    if not nrows:
        nrows = len(dim_pairs) // ncols + 1
    elif not ncols:
        ncols = len(dim_pairs) // nrows + 1
    ncells = nrows * ncols
    figsize = theme_figsize(width=width, aspect=aspect or nrows / ncols).figsize

    # Pre-compute densities
    #   - HACK HACK HACK Taking lots of shortcuts here to solve my current use case and move on. Very brittle. Keep
    #     hacky bits gated behind diag_hack=True, off by default.
    if diag_hack:
        densities = []
        for ci in range(ndims):
            c = dim_name(ci)
            hue = scatter_kwargs.get('hue', None)
            groups = df.groupby(hue) if hue else [(None, df)]
            densities.append([
                [xs, ys]
                for name, g in groups
                for xs in [np.linspace(df[c].min() * 1.2, df[c].max() * 1.2, 100)]
                for ys in [scipy.stats.kde.gaussian_kde(g[c])(xs)]
            ])
        # Transform ys to fit within ylim
        y_max = max(
            np.max(ys)
            for groups in densities
            for (xs, ys) in groups
        )
        for groups in densities:
            for g in groups:
                g[1] = g[1] * (ylim[1] - ylim[0]) / (y_max * 1.05) + ylim[0]

    # Plot
    xmin = xmax = ymin = ymax = 0
    fig, axes = plt.subplots(nrows, ncols, sharex=sharex, sharey=sharey, figsize=figsize)
    if (nrows, ncols) == (1, 1):
        axes = {(0, 0): axes}
    for i in range(ncells):
        (r, c) = (i // ncols, i % ncols)
        ax = axes[r, c]
        legend = 'full' if (r, c) == (nrows - 1, 0) else False  # Show legend only once, in the (empty) bottom-left cell
        if pack:
            j = i
        else:
            row_starts = np.cumsum([0, *np.arange(ndims - 1, 0, -1)])
            j = row_starts[r] + c if r < ndims and c < ndims else None
        if j is not None and j < len(dim_pairs) and (pack or c >= r):
            (yi, xi) = dim_pairs[j]
            (y, x) = (dim_name(yi), dim_name(xi))
            if x != y:
                sns.scatterplot(ax=ax, data=df, x=x, y=y, **scatter_kwargs, legend=legend)
                ax.axhline(color='black', alpha=.1, zorder=-1)
                ax.axvline(color='black', alpha=.1, zorder=-1)
                ax.set_title('%s,%s' % (yi, xi), **title_kwargs)
                xmin = min(xmin, df[x].min())
                xmax = max(xmax, df[x].max())
                ymin = min(ymin, df[y].min())
                ymax = max(ymax, df[y].max())
            elif diag_hack:
                for xs, ys in densities[xi]:
                    ax.plot(xs, ys, **diag_kwargs)
                ax.set_title('%s' % xi, **title_kwargs)
                ax.axvline(color='black', alpha=.1, zorder=-1)
        elif legend:
            # If we're on the last cell but out of dim_pairs, draw a blank plot to ensure the legend gets drawn
            (yi, xi) = dim_pairs[0]
            (y, x) = (dim_name(yi), dim_name(xi))
            sns.scatterplot(data=df, x=x, y=y, ax=ax, **{**scatter_kwargs, 'marker': ''}, legend=legend)
        ax.set_xlabel('')
        ax.set_ylabel('')

    # Limits
    plt.xlim(xlim)
    plt.ylim(ylim)

    # Aesthetics
    sns.despine()  # Just top,right by default (pass more params for left,bottom)
    plt.tight_layout()

    if suptitle:
        fig.suptitle(suptitle)
        fig.subplots_adjust(top=suptitle_top)  # Manually adjust top margin for tight_layout + suptitle (ugh)
