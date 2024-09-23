#!/bin/bash

FILE_NAME="ourgroceries-plus"

if [[ -f "./${FILE_NAME}.zip" ]]; then
  \rm -i "./${FILE_NAME}.zip"
  if [[ -f "./${FILE_NAME}.zip" ]]; then
    echo >&2 'Cannot continue while the old .zip exists'
    exit 1
  fi
fi

echo "Zipping..."
zip -r -q "./${FILE_NAME}.zip" res/ src/ manifest.json