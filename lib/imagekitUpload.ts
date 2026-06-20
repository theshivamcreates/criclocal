export async function uploadToImageKit(file: File, fileName: string): Promise<string> {
  const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY is not defined in environment variables.");
  }

  // 1. Get authentication parameters from our backend API
  const authResponse = await fetch("/api/imagekit/auth");
  if (!authResponse.ok) {
    throw new Error("Failed to get ImageKit authentication parameters from server.");
  }
  const authData = await authResponse.json();

  if (authData.error) {
    throw new Error(authData.error);
  }

  // 2. Prepare formData for ImageKit Upload API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", fileName);
  formData.append("publicKey", publicKey);
  formData.append("signature", authData.signature);
  formData.append("expire", authData.expire.toString());
  formData.append("token", authData.token);
  formData.append("folder", "/cricket_overlay_profiles"); 

  // 3. Upload to ImageKit
  const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errData = await uploadResponse.json();
    throw new Error(errData.message || "Failed to upload image to ImageKit");
  }

  const uploadResult = await uploadResponse.json();

  // 4. Transform URL to minimize bandwidth (400x400 square, quality 80, auto-format webp/avif)
  // ImageKit automatically optimizes when `f-auto` is added.
  const optimizedUrl = `${uploadResult.url}?tr=w-400,h-400,q-80,f-auto`;

  return optimizedUrl;
}
