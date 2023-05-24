import Link from 'next/link';
import { redirect } from 'next/navigation';
import createClient from 'src/lib/supabase-server';
import FileUpload from '@/components/FileUpload';

export default async function Profile() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  return (
    <div>
      {!user ? (
        <div className="flex h-full w-full   p-4">
          <div>you can't see the upload page because you're not signed in</div>
        </div>
      ) : (
        <div
          className="flex h-full w-full flex-col  p-4"
          style={{ minWidth: 250, maxWidth: 600, margin: 'auto' }}
        >
          <FileUpload user={user}></FileUpload>
        </div>
      )}
    </div>
  );
}
