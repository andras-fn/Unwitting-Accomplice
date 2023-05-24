'use client';
import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

const FileUpload = ({ user }) => {
  //const { user } = Auth.useUser();
  const aRef = useRef(null);
  const [file, setfile] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('file upload button has been clicked');

    try {
      const fileUuid = uuidv4();

      async function uploadFile() {
        console.log('Read file to be uploaded');
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(`${user.id}/${fileUuid}/${file.name}`, file, {
            upsert: false,
          });
        console.log('Done the upload');

        return { data, error };
      }

      console.log('Starting upload of file to Supabase');
      const uploadFileResult = await uploadFile();
      console.log('Finished uploading file to Supabase');
      console.log(`File upload result: ${JSON.stringify(uploadFileResult)}`);

      // save data to database
      async function saveData() {
        let { data, error } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            doc_id: fileUuid,
            storage_filepath: uploadFileResult.data.path,
            filename: file.name,
          })
          .select('doc_id');

        return { data, error };
      }

      console.log('Starting to save data to Supabase');
      const saveDataResult = await saveData();
      console.log('Finished saving data to Supabase');
      console.log(`Save data result: ${JSON.stringify(saveDataResult)}`);

      // create event in inngest - via api
      const reqBody = { uuid: fileUuid };
      const res = await fetch(`/api/inngest/text-layer-extraction`, {
        method: 'POST',
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();
      console.log(data);

      // reset the file upload
      console.log('resetting file state');
      aRef.current.value = null;

      // show an alert
      console.log('show success alert');
      alert('File successfully uploaded');
    } catch (e) {
      console.log(e);
    }
  };

  const handleFileSelected = (e) => {
    setfile(e.target.files[0]);
  };
  return (
    <form onSubmit={handleSubmit}>
      <input type="file" name="image" ref={aRef} onChange={handleFileSelected} />
      <button type="submit">Upload image</button>
    </form>
  );
};
export default FileUpload;
