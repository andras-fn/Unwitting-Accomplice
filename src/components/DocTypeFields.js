'use client';
import { useState } from 'react';
// probably need to package the form into it's own component

export default async function DocTypeFields(fieldData) {
  const { fields } = fieldData;
  const [data, setData] = useState(fields && fields);

  // add more fields
  const handleAddFieldClick = (e) => {
    e.preventDefault();
    const calculatedId = function () {
      if (data.length) {
        const sortedData = data.sort((a, b) => {
          return a.id - b.id;
        });

        return sortedData[sortedData.length - 1].id + 1;
      } else {
        return 0;
      }
    };

    setData([...data, { id: calculatedId(), displayName: '', extractionName: '' }]);
  };

  const handleDeleteFieldClick = (e) => {
    e.preventDefault();

    const filtered = data.filter((a) => {
      console.log(a.id);
      console.log(e.target.id);
      if (parseInt(a.id) !== parseInt(e.target.id)) {
        return a;
      }
    });

    setData(filtered);
  };

  return (
    <div className="doc-type-fields-frame">
      {data &&
        data.map((field, i) => (
          <div key={field.id} className={`field-wrapper {"fieldId":"${field.id}"}`}>
            <input
              className="displayName m-2 border-slate-300 p-1"
              type="text"
              name="displayName"
              defaultValue={field.displayName}
              required
            ></input>
            :
            <input
              className="extractionName m-2 border-slate-300 p-1"
              type="text"
              name="extractionName"
              defaultValue={field.extractionName}
              required
            ></input>
            <button
              id={field.id}
              className="field-delete-btn m-2 border bg-red-600 p-1 text-white"
              onClick={handleDeleteFieldClick}
            >
              Delete
            </button>
          </div>
        ))}
      <button className="m-2 border p-1" onClick={handleAddFieldClick}>
        + Add a field
      </button>
    </div>
  );
}
