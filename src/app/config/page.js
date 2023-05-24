import { redirect } from 'next/navigation';
import createClient from 'src/lib/supabase-server';
import DocTypeWrapper from '@/components/DocTypeWrapper';

export default async function Profile() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('doc_type_rules')
    .select(`rule_id, id,extraction_name, doc_type_rules`)
    .order('id', { ascending: true });

  return (
    <div className="card">
      <DocTypeWrapper supaDocTypeData={data}></DocTypeWrapper>
    </div>
  );
}
