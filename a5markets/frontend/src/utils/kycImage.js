const MAX_IMAGE_SIDE = 1600;
const JPEG_QUALITY = 0.82;

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Unable to read the image.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Camera pictures are commonly 4–12 MB each. Two original Base64 pictures can
 * exceed the API request limit, so convert them to a review-quality JPEG first.
 */
export async function kycImageDataUrl(file) {
  if (!file) throw new Error('Choose an image first.');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Use a JPG, PNG, or WEBP image.');
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof URL === 'undefined') {
    return readFileDataUrl(file);
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('This photo could not be processed. Please choose a JPG, PNG, or WEBP image.'));
      nextImage.src = sourceUrl;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return readFileDataUrl(file);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
