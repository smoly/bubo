class ApiError(Exception):

    def __init__(self, status_code: int, msg: str, **kwargs):
        self.status_code = status_code
        self.msg = msg
        self.kwargs = dict(kwargs)
        super().__init__(self.status_code, self.msg, self.kwargs)

    def __str__(self):
        return repr(self)

    def __repr__(self):
        return '%s(%s, %s, %s)' % (
            type(self).__name__,
            self.status_code,
            self.msg,
            ', '.join('%s=%r' % (k, v) for k, v in self.kwargs.items()),
        )