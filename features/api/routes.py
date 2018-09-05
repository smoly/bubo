import inspect
import traceback
from typing import Callable, Sequence

from flask import Blueprint, redirect, render_template, request, Response
from flask.json import jsonify
from potoo.ipython import ipy_formats, ipy_formats_to_html
from potoo.util import ensure_endswith
import structlog

import api.recs
from util import *

log = structlog.get_logger(__name__)
bp = Blueprint('routes', __name__, static_folder='api/static')


#
# Routes
#


@bp.route('/')
def root():
    return redirect('/health')


@bp.route('/health')
def health():
    return jsonify('healthy')


@bp.route('/debug/error')
def error():
    raise Exception('oops')


@bp.route('/api/recs/xc/meta', methods=['GET'])
def api_recs_xc_meta():
    return jsonify_df(with_parsed_request_args(
        api.recs.xc_meta,
        request.args,
    ))


@bp.route('/recs/xc/species', methods=['GET'])
def recs_xc_species():
    return htmlify_df('recs_xc_species.html.j2', with_parsed_request_args(
        api.recs.xc_species_html,
        request.args,
    ))


@bp.route('/recs/xc/similar', methods=['GET'])
def recs_xc_similar():
    return htmlify_df('recs_xc_similar.html.j2', with_parsed_request_args(
        api.recs.xc_similar_html,
        request.args,
    ))


#
# Util
#


def with_parsed_request_args(
    func: Callable[[str], any],
    request_args: dict,
    overrides: dict = {},
    checks: dict = {},
) -> any:
    return func(**_parse_request_args(
        func,
        request_args,
        overrides,
        checks,
    ))


def _parse_request_args(
    func: Callable[[str], any],
    request_args: dict,
    overrides: dict = {},
    checks: dict = {},
) -> dict:
    """
    Compute parsed args for func but don't call func, for easier testing
    """

    kwargs = request_args.to_dict()  # MultiMap -> dict
    kwargs_in = kwargs.copy()  # Preserve initial state to avoid side effects

    # 1. Parse args explicitly via user override
    for k, parse in overrides.items():
        try:
            v = overrides[k](kwargs_in)
        except Exception as e:
            raise ResponseStatusException(400, 'Invalid param', param=k, error=e)
        if v is None:
            del kwargs[k]
        else:
            kwargs[k] = v

    # 2. Parse resulting args implicitly via function signature
    for k, v_str in kwargs.items():
        try:
            v = _parse_request_arg(func, k, v_str)
        except Exception as e:
            raise ResponseStatusException(400, 'Invalid param', param=k, value=v_str, error=e)
        kwargs[k] = v

    # 3. Validate parsed values via user checks
    for k, (check, is_valid) in checks.items():
        if k in kwargs:
            if not is_valid(kwargs[k]):
                raise ResponseStatusException(400, 'Invalid param', param=k, value=kwargs[k], check=check)

    # Return 400 if kwargs don't match func signature
    _validate_kwargs(func, **kwargs)

    return kwargs


def _parse_request_arg(func, k: str, v: str) -> any:
    typ = inspect.getfullargspec(func).annotations.get(k)
    if typ is None:
        parse = lambda x: x
    elif typ == Sequence[str]:
        parse = lambda x: x.split(',')
    # elif typ == ...
    #    ...
    else:
        parse = typ
    return parse(v)


def _validate_kwargs(func, **kwargs):
    argspec = inspect.getfullargspec(func)
    argspec_defaults = argspec.defaults or []
    required_args = argspec.args[:-len(argspec_defaults)] if len(argspec_defaults) else argspec.args
    optional_args = dict(zip(argspec.args[-len(argspec_defaults):], argspec_defaults))
    if set(kwargs) - {*required_args, *optional_args}:
        raise ResponseStatusException(400, 'Extraneous params',
            required=required_args,
            optional=optional_args,
            given=kwargs,
        )
    elif set(required_args) - set(kwargs):
        raise ResponseStatusException(400, 'Missing params',
            required=required_args,
            optional=optional_args,
            given=kwargs,
        )


def jsonify_df(df) -> Response:
    return jsonify(df.to_dict(orient='records'))


def htmlify_df(template: str, df) -> str:
    # disp_html = ipy_formats_to_html(df)  # XXX This doesn't know df_cell's
    disp_html = ipy_formats._format_df(df, mimetype='text/html')  # HACK Promote this from private (and rename?)
    return htmlify_html(
        template=template,
        body_html=disp_html,
    )


def htmlify_html(template: str, body_html: str) -> str:
    return render_template(template,
        body_html=body_html,
        # (More stuff will end up here...)
    )


class ResponseStatusException(Exception):
    def __init__(self, status_code: int, reason: str, error: BaseException = None, **data):
        self.status_code = status_code
        self.payload = dict(
            reason=reason,
            data=data,
        )
        self.error = error
        if error is not None:
            self.payload['error'] = f'{type(error).__name__}: {error}'


@bp.errorhandler(ResponseStatusException)
def exception_to_response_with_status(e: ResponseStatusException):
    if e.error is not None:
        log.debug('ResponseStatusException_with_error', e=e)
        traceback.print_exception(None, e, e.__traceback__)
    return jsonify(e.payload), e.status_code
