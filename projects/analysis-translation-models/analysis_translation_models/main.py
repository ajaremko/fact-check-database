import argostranslate.package

argostranslate.package.update_package_index()
available_packages = argostranslate.package.get_available_packages()

# Find a specific package (e.g., English to Spanish)
from_code = "en"
to_code = "es"
package_to_install = next(
    filter(
        lambda x: x.from_code == from_code and x.to_code == to_code,
        available_packages
    )
)

# Download and install
argostranslate.package.install_from_path(package_to_install.download())
