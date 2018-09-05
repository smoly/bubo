import os

from attrdict import AttrDict

role = os.environ.get('BUBO_ROLE')

# Global mutable config (handle with care)
config = AttrDict(

    role=role,

    audio_to_url = dict(
        url_type={
            # Tradeoffs:
            #   - notebook: Files are way faster (~instant) and more lightweight (~0 mem) than inline data urls for #
            #     displaying many audios at once (>>10)
            #   - api: Data urls don't require serving the resource
            'api':      'data',
            'notebook': 'file',
            None:       'file',
        }[role],
    ),

)