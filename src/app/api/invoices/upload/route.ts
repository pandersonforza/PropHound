import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a file using the "file" field.' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are accepted.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFilename = `invoices/${Date.now()}-${originalName}`;

    const blob = await put(uniqueFilename, file, {
      access: 'public',
      contentType: 'application/pdf',
    });

    return NextResponse.json({
      filePath: blob.url,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Failed to upload invoice file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
