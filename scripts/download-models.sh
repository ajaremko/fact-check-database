import os
import urllib.request
import argostranslate.package
# from google.cloud import storage

# 1. Configuration
from_code = "en" # Source language
to_code = "es"   # Target language
# bucket_name = "your-gcs-bucket-name"
# gcs_folder = "argos-models" # Folder inside your GCS bucket

# 2. Find and download the model
argostranslate.package.update_package_index()
available_packages = argostranslate.package.get_available_packages()

package_to_install = next(
    filter(
        lambda x: x.from_code == from_code and x.to_code == to_code,
        available_packages
    )
)

print(f"Downloading model {from_code} -> {to_code}...")
url = package_to_install.url
file_name = url.split('/')[-1]

# Download the file to your local machine
urllib.request.urlretrieve(url, file_name)
print(f"Downloaded {file_name} locally.")

# # 3. Upload to GCS
# print(f"Uploading {file_name} to GCS bucket '{bucket_name}'...")
# storage_client = storage.Client()
# bucket = storage_client.bucket(bucket_name)

# # Create the full GCS path/blob name
# blob = bucket.blob(f"{gcs_folder}/{file_name}")
# blob.upload_from_filename(file_name)

# # Clean up local file (optional)
# os.remove(file_name)

# print(f"Successfully uploaded to gs://{bucket_name}/{gcs_folder}/{file_name}")