'use client';
import { useState } from 'react';
import DocTypeFields from './DocTypeFields';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
// deleting a doctype deletes the bottom one, need to grab the id?
// trying to enter text into any field makes the whole thing reload and no text appears

export default async function DocTypeWrapper({ supaDocTypeData }) {
  // fetch data here and then load it into state
  const [docTypeData, setDocTypeData] = useState(supaDocTypeData && supaDocTypeData);

  // add more doc types
  const handleAddDocTypeClick = (e) => {
    e.preventDefault();
    const calculatedId = function () {
      if (docTypeData.length) {
        const sortedData = docTypeData.sort((a, b) => {
          return a.id - b.id;
        });

        return sortedData[sortedData.length - 1].id + 1;
      } else {
        return 0;
      }
    };

    console.log(`new id: ${calculatedId()}`);
    setDocTypeData([
      ...docTypeData,
      {
        id: calculatedId(),
        extraction_name: '',
        doc_type_rules: [{ id: 0, displayName: '', extractionName: '' }],
      },
    ]);
  };

  const handleDeleteDocTypeClick = async (e) => {
    e.preventDefault();

    // do work here - should prompt for an "are you sure?????"
    if (confirm('Are you really sure you want to delete this Doc Type?') == true) {
      const filtered = docTypeData.filter((a) => {
        console.log(a.id);
        if (parseInt(a.id) !== parseInt(e.target.id)) {
          return a;
        }
      });

      // delete it from supabase here
      const { error } = await supabase
        .from('doc_type_rules')
        .delete()
        .eq('id', e.target.id);

      // update the state
      if (error === null) {
        setDocTypeData(filtered);
      } else {
        alert(`Failed to delete doc type: ${error}`);
      }
    }
  };

  const handleSaveDocTypeClick = async (e) => {
    e.preventDefault();

    // get the rule namee
    const extraction_name =
      e.target.parentElement.parentElement.parentElement.parentElement.querySelector(
        '.extraction_name'
      ).value;

    // get the rule id
    const docTypeId = e.target.id;

    // get the rule fields
    const listOfFields = Array.from(
      e.target.parentElement.parentElement.parentElement.parentElement.querySelectorAll(
        '.field-wrapper'
      )
    );

    // create the object to be stored in db
    const fieldObj = listOfFields.map((field) => {
      return {
        id: field.querySelector('.field-delete-btn').id,
        displayName: field.querySelector('.displayName').value,
        extractionName: field.querySelector('.extractionName').value,
      };
    });

    const dbObj = {
      id: docTypeId,
      extraction_name: extraction_name,
      doc_type_rules: fieldObj,
    };

    console.log(`upload bod: ${JSON.stringify(dbObj)}`);

    // upload data to supabase
    const { data, error } = await supabase.from('doc_type_rules').upsert(dbObj).select();

    // throw an alert to save saved
    if (error === null) {
      alert('Doc type successfully saved');
    } else {
      alert(`Doc type failed to save: ${error}`);
    }
  };

  return (
    <div className="">
      <button className="m-2 mb-8 border p-1" onClick={handleAddDocTypeClick}>
        + Add a Document Type
      </button>
      <div className="doc-type-wrapper">
        {docTypeData &&
          docTypeData.map((docType, i) => (
            <div
              key={docType.id}
              id={docType.id}
              className="doc-type-frame mb-4 border border-black"
            >
              <form>
                <div className="frame-header flex items-center justify-between border-b border-black">
                  <input
                    className="extraction_name m-2 border-slate-300 p-1"
                    type="text"
                    name="extraction_name"
                    defaultValue={docType.extraction_name}
                    required
                  ></input>

                  <div>
                    <button
                      className="mb-2 ml-2 mr-1 mt-2 border bg-red-600 p-1 text-white"
                      onClick={handleDeleteDocTypeClick}
                      id={docType.id}
                    >
                      Delete
                    </button>
                    <button
                      id={docType.id}
                      onClick={handleSaveDocTypeClick}
                      className="mb-2 ml-1 mr-2 mt-2 border p-1"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <DocTypeFields
                  key={docType.id}
                  fields={docType && docType.doc_type_rules}
                ></DocTypeFields>
              </form>
            </div>
          ))}
      </div>
    </div>
  );
}
