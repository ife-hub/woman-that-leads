import QRCode from "qrcode";

/**
 * Encodes a check-in token into a QR code.
 * Returns both a data URL (to embed inline / show on screen) and a PNG
 * buffer (to attach to the confirmation email).
 */
export async function generateCheckInQr(token: string) {
  const payload = JSON.stringify({ t: token });

  const [dataUrl, buffer] = await Promise.all([
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 480,
      color: {
        dark: "#3C1220",
        light: "#FFFFFF",
      },
    }),
    QRCode.toBuffer(payload, {
      margin: 1,
      width: 480,
      color: {
        dark: "#3C1220",
        light: "#FFFFFF",
      },
    }),
  ]);

  return { dataUrl, buffer };
}