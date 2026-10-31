import * as ImageManipulator from 'expo-image-manipulator';

export interface CameraCaptureFile {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  mimeType: 'image/jpeg';
}

const MAX_CAPTURE_WIDTH = 1280;
const CAPTURE_COMPRESSION = 0.08;

function buildFileName(uri: string) {
  return uri.split('/').pop() || `capture-${Date.now()}.jpg`;
}

/** Shrinks a photo to the upload size and returns it as a JPEG file. */
export async function toCaptureFile(
  photo: { uri: string; width: number; height: number },
  fileName?: string | null
): Promise<CameraCaptureFile> {
  const manipulator = ImageManipulator.ImageManipulator.manipulate(photo.uri);

  if (photo.width > MAX_CAPTURE_WIDTH) {
    manipulator.resize({ width: MAX_CAPTURE_WIDTH, height: null });
  }

  const renderedImage = await manipulator.renderAsync();
  const optimizedImage = await renderedImage.saveAsync({
    compress: CAPTURE_COMPRESSION,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: optimizedImage.uri,
    width: optimizedImage.width,
    height: optimizedImage.height,
    fileName: buildFileName(fileName ?? optimizedImage.uri),
    mimeType: 'image/jpeg',
  };
}
