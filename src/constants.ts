export const DEFAULT_IGNORE_PATTERNS = `# Default .promptcode_ignore file
# These patterns will be used to exclude files from your prompts

# Audio formats
*.mp3
*.wav
*.ogg
*.flac
*.aac
*.m4a
*.wma

# Video formats
*.mp4
*.avi
*.mov
*.wmv
*.mkv
*.flv
*.webm

# Document formats
*.pdf
*.doc
*.docx
*.ppt
*.pptx
*.xls
*.xlsx

# Binary executables and libraries
*.exe
*.dll
*.so
*.dylib
*.bin
*.o
*.obj
*.class

# Machine learning models
*.pkl
*.h5
*.model
*.pb
*.onnx
*.npy
*.npz

# Additional lock files
yarn.lock
Gemfile.lock
Cargo.lock
poetry.lock
pnpm-lock.yaml

# Image formats
*.png
*.jpg
*.jpeg
*.gif
*.svg
*.bmp
*.tiff
*.webp
*.ico
*.avif

# Font formats
*.ttf
*.otf
*.woff
*.woff2
*.eot

# Build outputs and dependencies
.git/
node_modules/
package-lock.json
dist/
build/
out/
target/
.next/
.nuxt/
.output/
.cache/
.parcel-cache/

# Next.js specific
next-env.d.ts
next.config.js
.next/

# Environment and local config
.env
.env.local
.env.development
.env.test
.env.production
.env*.local
.DS_Store
*.log

# Python specific
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
.venv
.coverage
htmlcov/
.pytest_cache/
.tox/

# IDE files
.idea/
.vscode/
*.swp
*.swo
*~

# Package files
*.tgz
*.tar.gz
*.zip
*.rar

# Large files and databases
*.sqlite
*.sqlite3
*.db
*.csv
*.parquet
*.gz

# Temporary files
tmp/
temp/
.temp/
`; 