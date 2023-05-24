import Link from 'next/link';
import { redirect } from 'next/navigation';

import SignOut from 'src/components/SignOut';
import createClient from 'src/lib/supabase-server';

export default async function Profile() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/');
  }

  const { data, error } = await supabase
    .from('documents')
    .select(
      `id, filename, text_layer_extracted, doc_type_extracted, doc_data_extracted,word_count, doc_type, doc_data`
    )
    .order('id', { ascending: true });

  // loop over data adding rows to a table

  return (
    <div className="card">
      <p className="text-2xl">Document List</p>
      <table className="table-auto">
        <thead className="border">
          <tr>
            <th className="border">Doc ID</th>
            <th className="border">Filename</th>
            <th className="border">Text Extracted</th>
            <th className="border">Document Type Extracted</th>
            <th className="border">Document Data Extracted</th>
            <th className="border">Word Count</th>
            <th className="border">Document Type</th>
            <th className="border">Document Data</th>
          </tr>
        </thead>
        <tbody className="border">
          {data &&
            data.map((row) => (
              <tr className="border">
                <td className="border">{row.id}</td>
                <td className="border">{JSON.stringify(row.filename)}</td>
                <td className="border">{JSON.stringify(row.text_layer_extracted)}</td>
                <td className="border">{JSON.stringify(row.doc_type_extracted)}</td>
                <td className="border">{JSON.stringify(row.doc_data_extracted)}</td>
                <td className="border">{JSON.stringify(row.word_count)}</td>
                <td className="border">{JSON.stringify(row.doc_type)}</td>
                <td className="border">{JSON.stringify(row.doc_data)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
