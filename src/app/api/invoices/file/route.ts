import { NextRequest, NextResponse } from 'next/server';
import { getDownloadUrl } from '@vercel/blob';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const downloadUrl = await getDownloadUrl(url);
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error('Failed to get download URL:', error);
    return NextResponse.json({ error: 'Failed to get file' }, { status: 500 });
  }
}
