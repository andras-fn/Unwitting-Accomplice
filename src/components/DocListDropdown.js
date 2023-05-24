'use client';
import { useState } from 'react';
import Select from 'react-select';

import Router from 'next/router';

import { supabase } from '@/lib/supabase';

export default async function DocListDropdown() {
  // const [isMenuOpen, setIsMenuOpen] = useState(false);
  // get list of doc types
  const { data, error } = await supabase
    .from('doc_type_rules')
    .select(`id, extraction_name`);

  const options = data.map((row) => {
    return { value: row.id, label: row.extraction_name };
  });

  console.log(options);

  const handleChange = async (e) => {
    console.log(e);
    Router.push('/');
  };

  return (
    <div className="mr-4 mt-4 block w-52 lg:mt-0 lg:inline-block">
      <Select
        placeholder="Please select"
        noOptionsMessage="No Doc Types found"
        onChange={handleChange}
        options={options}
      />
    </div>
  );
}
