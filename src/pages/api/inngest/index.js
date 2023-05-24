import { serve } from 'inngest/next';
import { supabase } from '@/lib/supabase';
import { Inngest } from 'inngest';
import { ChatGPTAPI } from 'chatgpt';

const path = require('node:path');

//do this because otherwise it doesn't work
const pdfworker = require('pdf.js-extract/lib/pdfjs/pdf.worker.js');

// import and set up the pdf data extractor
const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();

// Create a client to send and receive events
export const inngest = new Inngest({ name: 'My App' });

// first function
const extractTextLayer = inngest.createFunction(
  { name: 'Extract Text Layer' },
  { event: 'extract.text.layer' },
  async ({ event, step }) => {
    try {
      const getDataResult = await step.run('Get document filepath', async () => {
        // get uuid from body
        const thisUuid = event.data.uuid.toString();
        console.log(`Incoming UUID: ${thisUuid}`);

        // get filepath
        console.log('Fetching filepath to document');
        const { data, error } = await supabase
          .from('documents')
          .select(`storage_filepath, doc_id`)
          .eq('doc_id', thisUuid);

        if (error === null) {
          const thisFilepath = data[0].storage_filepath;
          console.log(`Constructed file path to download the file to: ${thisFilepath}`);
        }
        console.log(`Retrieved data for document with UUID: ${thisUuid}`);

        return { data, error };
      });

      const getFileResult = await step.run('Get document from storage', async () => {
        console.log(`Filepath: ${getDataResult.data[0].storage_filepath}`);
        const { data, error } = await supabase.storage
          .from('documents')
          .download(getDataResult.data[0].storage_filepath);

        console.log('Downloaded file');

        const buffer = Buffer.from(await data.arrayBuffer());
        console.log('Created buffer from file');

        console.log('Starting text extraction');

        //   // set options for pdf parse
        const options = {};

        const pdfData = await pdfExtract.extractBuffer(buffer, options);

        // pull out just the text and put it in a array
        const freeTextArr = [];
        pdfData.pages.forEach((page) => {
          page.content.forEach((content) => {
            freeTextArr.push(content.str);
          });
        });

        // convert array to string
        const freeText = freeTextArr.join(' ');

        console.log('Finished text extraction');

        return { extractedTextString: freeText, error };
      });

      // update record in supabase with extracted pdf data

      const updateDataResult = await step.run('Update the document data', async () => {
        let { data, error } = await supabase
          .from('documents')
          .update({
            text_layer: getFileResult.extractedTextString,
            text_layer_extracted: true,
            word_count: getFileResult.extractedTextString.length,
          })
          .eq('doc_id', getDataResult.data[0].doc_id);

        if (data === null) {
          console.log(`Update data result: success`);
        } else {
          console.log('Update data result: fail');
        }

        return { data, error };
      });

      //send inngest event for doc type extraction
      const createDocTypeEvent = await step.run('Update the document data', async () => {
        // create event in inngest - via api
        const reqBody = { uuid: getDataResult.data[0].doc_id };
        console.log(`Create doc type event body: ${JSON.stringify(reqBody)}`);
        const res = await fetch(`http://localhost:3000/api/inngest/doc-type-extraction`, {
          method: 'POST',
          body: JSON.stringify(reqBody),
        });
        const data = await res.json();
        console.log(data);
        return { data };
      });

      // end
      //await step.sleep('1s');
      return {
        event,
        body: {
          success: true,
          message: 'Text Layer successfully extracted',
          uuid: getDataResult.data[0].doc_id,
        },
      };
    } catch (error) {
      console.log(error);
      await step.sleep('1s');
      return {
        event,
        body: {
          success: false,
          message: `Text Layer Extraction Failed with this error: ${error}`,
          uuid: getDataResult.data[0].doc_id,
        },
      };
    }
  }
);

// extract doc type function
const extractDocType = inngest.createFunction(
  { name: 'Extract Doc Type' },
  { event: 'extract.doc.type' },
  async ({ event, step }) => {
    try {
      // get text layer
      const getTextLayer = await step.run('Get text layer for the document', async () => {
        console.log('Starting doc type extraction');
        // get uuid from body
        const thisUuid = event.data.uuid.toString();
        console.log(`Incoming UUID: ${thisUuid}`);

        const { data, error } = await supabase
          .from('documents')
          .select(`doc_id, text_layer`)
          .eq('doc_id', thisUuid);

        if (data !== null) {
          console.log(`Get text layer result: success`);
        } else {
          console.log('Get text layer result: fail');
        }

        return { data, error };
      });

      // get list of doc types
      const getListOfDocTypes = await step.run(
        'Get a list of available document types',
        async () => {
          const { data, error } = await supabase
            .from('doc_type_rules')
            .select(`id,extraction_name, doc_type_rules`);

          if (data !== null) {
            console.log(`Get list of doc types result: success`);
          } else {
            console.log('Get list of doc types result: fail');
          }

          return { data, error };
        }
      );

      // send doc and list of doc types to chatgpt
      const sendDocTypesAndTextLayer = await step.run(
        'Send document types and text layer to ChatGPT',
        async () => {
          console.log('Starting doc type extraction');
          // convert array of doc types to text string
          const arrayJustDocTypes = getListOfDocTypes.data.map((result) => {
            return result.extraction_name;
          });
          const listOfDocTypes = arrayJustDocTypes.join(', ');
          console.log(JSON.stringify(listOfDocTypes));

          // set up request to chatgpt
          const api = new ChatGPTAPI({
            apiKey: process.env.OPENAI_API_KEY,
            completionParams: {
              model: 'gpt-4',
              temperature: 0,
            },
          });

          // create message
          const docTypeMessage = `Please tell me if the data at the end of this request is one of the following: ${JSON.stringify(
            listOfDocTypes
          )} only. If unknown return null. Do this in the following format only: "Document Type: ": ${
            getTextLayer.data[0].text_layer
          }`;
          console.log(docTypeMessage);
          // send message
          const docTypeRes = await api.sendMessage(docTypeMessage);

          // split out doc types from message
          const detectedDocType = docTypeRes.text.split(': ')[1].replace('.', '');

          console.log('Finished doc type extraction');

          return { documentType: detectedDocType };
        }
      );

      // store doc type in db
      const storeDocType = await step.run('Store detected document type', async () => {
        console.log('Starting to store doc type in db');
        let { data, error } = await supabase
          .from('documents')
          .update({
            doc_type: sendDocTypesAndTextLayer.documentType,
            doc_type_extracted: true,
          })
          .eq('doc_id', event.data.uuid.toString());

        if (data === null) {
          console.log(`Update data result: success`);
        } else {
          console.log('Update data result: fail');
        }

        console.log('Finished storing doc type in db');

        return { data, error };
      });

      // send doc data event
      const createDocDataEvent = await step.run(
        'Create doc data etxraction event',
        async () => {
          // create event in inngest - via api
          const reqBody = { uuid: event.data.uuid.toString() };
          console.log(`Create doc type event body: ${JSON.stringify(reqBody)}`);
          const res = await fetch(
            `http://localhost:3000/api/inngest/doc-data-extraction`,
            {
              method: 'POST',
              body: JSON.stringify(reqBody),
            }
          );
          const data = await res.json();
          console.log(data);
          return { data };
        }
      );

      // finish
      return {
        event,
        body: {
          success: true,
          message: 'Doc Type successfully extracted',
          uuid: event.data.uuid.toString(),
        },
      };
    } catch (error) {
      console.log(error);
      await step.sleep('1s');
      return {
        event,
        body: {
          success: false,
          message: `Doc Type Extraction Failed with this error: ${error}`,
          uuid: event.data.uuid.toString(),
        },
      };
    }
  }
);

// extract doc data function
const extractDocData = inngest.createFunction(
  { name: 'Extract Doc Data' },
  { event: 'extract.doc.data' },
  async ({ event, step }) => {
    try {
      // get text layer
      const getTextLayer = await step.run('Get text layer for the document', async () => {
        console.log('Starting doc type extraction');
        // get uuid from body
        const thisUuid = event.data.uuid.toString();
        console.log(`Incoming UUID: ${thisUuid}`);

        const { data, error } = await supabase
          .from('documents')
          .select(`doc_id, text_layer`)
          .eq('doc_id', thisUuid);

        if (data !== null) {
          console.log(`Get text layer result: success`);
        } else {
          console.log('Get text layer result: fail');
        }

        return { data, error };
      });

      // get doc type from db
      const getDocType = await step.run('Get doc type for the document', async () => {
        console.log('Starting doc data extraction');
        console.log('Getting doc type from db');
        // get uuid from body
        const thisUuid = event.data.uuid.toString();
        console.log(`Incoming UUID: ${thisUuid}`);

        const { data, error } = await supabase
          .from('documents')
          .select(`doc_id, doc_type`)
          .eq('doc_id', thisUuid);

        if (data !== null) {
          console.log(`Get text layer result: success`);
        } else {
          console.log('Get text layer result: fail');
        }

        return { data, error };
      });

      // get rules from db
      const getRules = await step.run('Get rules for doc type', async () => {
        console.log('Getting rules');

        const { data, error } = await supabase
          .from('doc_type_rules')
          .select(`doc_type_rules`)
          .eq('extraction_name', getDocType.data[0].doc_type);

        if (data !== null) {
          console.log(`Get text layer result: success`);
        } else {
          console.log('Get text layer result: fail');
        }

        return { data, error };
      });

      // send doc + rules to chatgpt
      const getDocData = await step.run(
        'Send document type and rules to ChatGPT',
        async () => {
          console.log('Sending rules to ChatGPT');
          // convert array of doc types to text string
          const arrayRules = getRules.data[0].doc_type_rules.map((result) => {
            return result.extractionName;
          });
          const listOfFields = arrayRules.join(', ');

          // set up request to chatgpt
          const api = new ChatGPTAPI({
            apiKey: process.env.OPENAI_API_KEY,
            completionParams: {
              model: 'gpt-4',
            },
          });

          // send extract data request to chatgpt
          const dataExtractMessage = `Please extract the ${listOfFields.replaceAll(
            '"',
            ''
          )} in this format. If you can't find a value then please return "null" for that value: ${
            getTextLayer.data[0].text_layer
          }`;

          //logger(`Data Extract Message: ${dataExtractMessage}`);
          const dataExtractRes = await api.sendMessage(dataExtractMessage);

          // split returned text on line ending
          const lineSplitData = dataExtractRes.text.split('\n');

          // for each item split it on : and then create a key and a value in the object based on it
          let jsonData = {};
          lineSplitData.forEach((value) => {
            const splitData = value.split(': ');
            jsonData[splitData[0]] = splitData[1];
          });

          console.log('Finished doc type extraction');

          return { documentData: jsonData };
        }
      );

      // store doc type in db
      const storeDocType = await step.run('Store detected document type', async () => {
        console.log('Starting to store doc data in db');
        let { data, error } = await supabase
          .from('documents')
          .update({
            doc_data: getDocData.documentData,
            doc_data_extracted: true,
          })
          .eq('doc_id', event.data.uuid.toString());

        if (data === null) {
          console.log(`Update data result: success`);
        } else {
          console.log('Update data result: fail');
        }

        console.log('Finished storing doc data in db');

        return { data, error };
      });

      // finish
      return {
        event,
        body: {
          success: true,
          message: 'Doc Data successfully extracted',
          uuid: event.data.uuid.toString(),
        },
      };
    } catch (error) {
      console.log(error);
      await step.sleep('1s');
      return {
        event,
        body: {
          success: false,
          message: `Doc Data Extraction Failed with this error: ${error}`,
          uuid: event.data.uuid.toString(),
        },
      };
    }
  }
);

// Create an API that hosts zero functions
export default serve(inngest, [extractTextLayer, extractDocType, extractDocData]);
