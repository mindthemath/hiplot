# Copyright (c) Facebook, Inc. and its affiliates.
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

package_name = "hiplot-mm"

# Dynamic version from installed package metadata
# This ensures __version__ matches pyproject.toml when installed via pip
try:
    from importlib.metadata import version, PackageNotFoundError
    try:
        version = version(package_name)
    except PackageNotFoundError:
        # Package is not installed (e.g., running from source checkout)
        version = "0.0.0.dev0"
except ImportError:
    # Python < 3.8 fallback
    try:
        import importlib_metadata
        version = importlib_metadata.version(package_name)
    except Exception:
        version = "0.0.0.dev0"
