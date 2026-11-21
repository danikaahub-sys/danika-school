import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "runtime_env", Path(__file__).with_name("preserve-runtime-env.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RuntimeEnvironmentTest(unittest.TestCase):
    def test_preserves_server_overrides_and_new_keys(self):
        actual = module.merge_runtime(
            {
                "DATABASE_URL": "stale-local",
                "REDIS_URL": "stale-redis",
                "NEW_SETTING": "new",
                "AUTH_ACCESS_TOKEN_SECRET": "canonical-access",
                "AUTH_REFRESH_TOKEN_SECRET": "canonical-refresh",
            },
            {
                "DATABASE_URL": "working-server",
                "REDIS_URL": "working-redis",
                "AUTH_ACCESS_TOKEN_SECRET": "old-access",
                "AUTH_REFRESH_TOKEN_SECRET": "old-refresh",
            },
        )
        self.assertEqual(actual["DATABASE_URL"], "working-server")
        self.assertEqual(actual["REDIS_URL"], "working-redis")
        self.assertEqual(actual["AUTH_ACCESS_TOKEN_SECRET"], "canonical-access")
        self.assertEqual(actual["AUTH_REFRESH_TOKEN_SECRET"], "canonical-refresh")
        self.assertEqual(actual["NEW_SETTING"], "new")

    def test_empty_server_value_does_not_clobber_upload(self):
        actual = module.merge_runtime(
            {
                "SENTRY_DSN": "https://uploaded",
                "AUTH_ACCESS_TOKEN_SECRET": "access",
                "AUTH_REFRESH_TOKEN_SECRET": "refresh",
            },
            {"SENTRY_DSN": "   "},
        )
        self.assertEqual(actual["SENTRY_DSN"], "https://uploaded")

    def test_server_only_keys_are_kept(self):
        actual = module.merge_runtime(
            {
                "AUTH_ACCESS_TOKEN_SECRET": "access",
                "AUTH_REFRESH_TOKEN_SECRET": "refresh",
            },
            {"REDIS_PASSWORD": "server-only"},
        )
        self.assertEqual(actual["REDIS_PASSWORD"], "server-only")

    def test_missing_canonical_secret_blocks_replacement(self):
        for incoming in (
            {},
            {"AUTH_ACCESS_TOKEN_SECRET": "access"},
            {"AUTH_REFRESH_TOKEN_SECRET": "refresh"},
        ):
            with self.assertRaises(ValueError):
                module.merge_runtime(incoming, {"DATABASE_URL": "working-server"})


if __name__ == "__main__":
    unittest.main()
