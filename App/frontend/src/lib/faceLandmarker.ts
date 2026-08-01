/**
 * Browser-side face landmark detection using MediaPipe Tasks Vision (WASM).
 * Detects 478 facial landmarks entirely in the browser — no server-side
 * MediaPipe or OpenCV needed.
 */
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let _landmarker: FaceLandmarker | null = null;
let _initPromise: Promise<FaceLandmarker> | null = null;

/**
 * Lazily initialise the FaceLandmarker singleton.
 * The WASM fileset is loaded from the jsDelivr CDN.
 */
async function getLandmarker(): Promise<FaceLandmarker> {
  if (_landmarker) return _landmarker;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
    );
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    _landmarker = landmarker;
    return landmarker;
  })();

  return _initPromise;
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceDetectionResult {
  landmarks: NormalizedLandmark[];
  imageWidth: number;
  imageHeight: number;
}

/**
 * Detect face landmarks from an HTMLImageElement.
 * Returns the 478 normalised landmarks (x, y, z ∈ [0,1]) for the first face.
 * Throws if no face is detected.
 */
export async function detectFaceLandmarks(
  imageElement: HTMLImageElement
): Promise<FaceDetectionResult> {
  const landmarker = await getLandmarker();
  const result = landmarker.detect(imageElement);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error(
      "No face detected in the image. Please upload a clear, front-facing photo."
    );
  }

  const landmarks = result.faceLandmarks[0].map((lm) => ({
    x: lm.x,
    y: lm.y,
    z: lm.z,
  }));

  return {
    landmarks,
    imageWidth: imageElement.naturalWidth,
    imageHeight: imageElement.naturalHeight,
  };
}

/**
 * Helper: load a base64 data URI into an HTMLImageElement.
 */
export function loadImageFromBase64(dataUri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUri;
  });
}