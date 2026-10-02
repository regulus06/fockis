const fs = require('node:fs');
const path = require('node:path');
const { Storage } = require('@google-cloud/storage');

require('dotenv').config({
  path: path.join(
    __dirname,
    'apps',
    'api',
    '.env',
  ),
});

const PROJECT_ROOT = __dirname;

const UPLOADS_DIR = path.join(
  PROJECT_ROOT,
  'apps',
  'api',
  'uploads',
);

const BUCKET_NAME =
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT;

const RAW_CREDENTIALS =
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

if (!BUCKET_NAME) {
  console.error(
    'ERROR: GOOGLE_CLOUD_STORAGE_BUCKET is missing.',
  );

  process.exit(1);
}

function createStorage() {
  if (!RAW_CREDENTIALS) {
    return new Storage({
      projectId: PROJECT_ID,
    });
  }

  let credentials;

  try {
    credentials =
      JSON.parse(RAW_CREDENTIALS);
  } catch (error) {
    console.error(
      'ERROR: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.',
    );

    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exit(1);
  }

  if (
    !credentials.client_email ||
    !credentials.private_key
  ) {
    console.error(
      'ERROR: Service account credentials are missing client_email or private_key.',
    );

    process.exit(1);
  }

  credentials.private_key =
    String(
      credentials.private_key,
    ).replace(
      /\\n/g,
      '\n',
    );

  return new Storage({
    projectId: PROJECT_ID,
    credentials,
  });
}

function getContentType(filename) {
  const extension =
    path.extname(filename)
      .toLowerCase();

  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',

    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',

    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',

    '.pdf': 'application/pdf',
  };

  return (
    types[extension] ||
    'application/octet-stream'
  );
}

function getAllFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const entries =
    fs.readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    );

  const files = [];

  for (const entry of entries) {
    const fullPath =
      path.join(
        directory,
        entry.name,
      );

    if (entry.isDirectory()) {
      files.push(
        ...getAllFiles(fullPath),
      );
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log('');
  console.log(
    '============================================================',
  );
  console.log(
    'FOCKIS — MIGRATE UPLOADS TO GOOGLE CLOUD STORAGE',
  );
  console.log(
    '============================================================',
  );
  console.log('');

  console.log(
    `Bucket: ${BUCKET_NAME}`,
  );

  console.log(
    `Uploads directory: ${UPLOADS_DIR}`,
  );

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('');
    console.error(
      `ERROR: Uploads directory does not exist: ${UPLOADS_DIR}`,
    );

    process.exit(1);
  }

  const files =
    getAllFiles(UPLOADS_DIR);

  console.log('');
  console.log(
    `Found ${files.length} local file(s).`,
  );

  if (files.length === 0) {
    console.log(
      'Nothing to migrate.',
    );

    return;
  }

  const storage =
    createStorage();

  const bucket =
    storage.bucket(BUCKET_NAME);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const localFile of files) {
    const relativePath =
      path.relative(
        UPLOADS_DIR,
        localFile,
      );

    const normalizedPath =
      relativePath.replace(
        /\\/g,
        '/',
      );

    /*
     * Keep the same filename that the
     * existing MongoDB records reference.
     *
     * Local:
     *
     * uploads/example.jpg
     *
     * GCS:
     *
     * posts/example.jpg
     */
    const objectName =
      `posts/${normalizedPath}`;

    try {
      const gcsFile =
        bucket.file(
          objectName,
        );

      const [exists] =
        await gcsFile.exists();

      if (exists) {
        console.log(
          `SKIP  ${normalizedPath}`,
        );

        skipped++;

        continue;
      }

      const contentType =
        getContentType(
          localFile,
        );

      console.log(
        `UPLOAD ${normalizedPath}`,
      );

      await bucket.upload(
        localFile,
        {
          destination:
            objectName,

          resumable: false,

          metadata: {
            contentType,

            cacheControl:
              'private, max-age=3600',
          },
        },
      );

      uploaded++;
    } catch (error) {
      failed++;

      console.error(
        `FAILED ${normalizedPath}`,
      );

      console.error(
        error instanceof Error
          ? error.message
          : String(error),
      );
    }
  }

  console.log('');
  console.log(
    '============================================================',
  );
  console.log('MIGRATION COMPLETE');
  console.log(
    '============================================================',
  );
  console.log(
    `Uploaded: ${uploaded}`,
  );
  console.log(
    `Skipped:  ${skipped}`,
  );
  console.log(
    `Failed:   ${failed}`,
  );
  console.log('');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('');
  console.error(
    'Migration failed:',
  );

  console.error(
    error instanceof Error
      ? error
      : String(error),
  );

  process.exit(1);
});