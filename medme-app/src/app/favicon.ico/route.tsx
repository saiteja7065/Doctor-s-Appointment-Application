import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image generation for favicon.ico
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#0F766E',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '6px',
        }}
      >
        🩺
      </div>
    ),
    {
      width: 32,
      height: 32,
      headers: {
        'Content-Type': 'image/x-icon',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    }
  );
}
