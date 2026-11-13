"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repo root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it too (.github/workflows/ci-docker.yml).

Covers: public checks pass and sign-in is skipped without credentials; a DB that
is not ready fails even if HTTP answers; a wrong running commit fails; the
session is logged out even if a check fails.
"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

SHA = 'a' * 40


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, cookie=None):
        return {
            '/api/health': b'{"status":"ok"}',
            '/api/ready': b'{"db":"connected"}',
            '/': b'<html></html>',
            '/api/categories': b'[{"id":1}]',
            '/api/version': ('{"commit":"%s"}' % SHA).encode(),
            '/api/auth/me': b'{"id":1}',
            '/api/auth/logout': b'{}',
        }[path]

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 4)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, **kwargs):
            return b'{"db":"disconnected"}' if path == '/api/ready' else self.response(base, path)
        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'EXPECTED_COMMIT': SHA}, clear=True)
    def test_expected_commit_is_checked(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/version')

    @patch.dict('os.environ', {'EXPECTED_COMMIT': 'b' * 40}, clear=True)
    def test_old_revision_still_serving_fails(self):
        with patch.object(smoke, 'request', side_effect=self.response), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/version'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_me_fails(self):
        def broken_me(base, path, data=None, cookie=None):
            if path == '/api/auth/me':
                raise ValueError('Broken response')
            return self.response(base, path, data, cookie)
        with patch.object(smoke, 'login', return_value='tt_session=test'), \
                patch.object(smoke, 'request', side_effect=broken_me) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')
            self.assertEqual(req.call_args.kwargs['cookie'], 'tt_session=test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test'}, clear=True)
    def test_half_configured_credentials_fail(self):
        with patch.object(smoke, 'request', side_effect=self.response):
            with self.assertRaisesRegex(RuntimeError, 'both'):
                smoke.check('https://demo.test')


if __name__ == '__main__':
    unittest.main()
