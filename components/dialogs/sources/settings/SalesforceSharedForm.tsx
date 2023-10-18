import { Field } from 'formik';
import { FC } from 'react';

import { NoAutoInput } from '@/components/ui/Input';
import { NoAutoTextArea } from '@/components/ui/TextArea';

type SalesforceSharedFormProps = {
  isSubmitting: boolean;
};

export interface SalesforceNangoMetadata {
  customFields: string[];
  filters: string;
  mappings: {
    title: string | undefined;
    content: string | undefined;
    path: string | undefined;
  };
  metadataFields: string[];
}

export const prepareFields = (input: string) => {
  return input.split(',').map((v) => v.trim());
};

export const SalesforceSharedForm: FC<SalesforceSharedFormProps> = ({
  isSubmitting,
}) => {
  return (
    <>
      <div className="FormHeadingGroup">
        <p className="FormHeading">SOQL query</p>
        <p className="FormSubheading">
          Specify how to query your Knowledge base.
        </p>
      </div>
      <div className="FormField">
        <p className="FormLabel">Custom fields (comma separated)</p>
        <Field
          className="h-[60px] flex-grow font-mono text-xs"
          type="text"
          name="customFields"
          placeholder={`Example: Language, IsPrivate, ArticleBody, UrlName`}
          textAreaSize="sm"
          as={NoAutoTextArea}
          disabled={isSubmitting}
        />
      </div>
      <div className="FormField">
        <div className="flex flex-row items-center gap-2">
          <p className="FormLabel flex-grow overflow-hidden truncate">
            Filters (SOQL &apos;WHERE&apos; clause)
          </p>
          <a
            className="subtle-underline flex-none whitespace-nowrap text-xs font-normal text-neutral-300"
            href="https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_conditionexpression.htm"
            rel="noreferrer"
            target="_blank"
          >
            Learn more
          </a>
        </div>
        <Field
          className="h-[120px] flex-grow font-mono text-xs"
          type="text"
          name="filters"
          placeholder={`Example: Language = 'en_US' AND IsPrivate = false`}
          textAreaSize="sm"
          as={NoAutoTextArea}
          disabled={isSubmitting}
        />
      </div>
      <div className="FormHeadingGroup">
        <p className="FormHeading">Mappings</p>
        <p className="FormSubheading">
          Specify how your object fields should map to files.
        </p>
      </div>
      <div className="grid grid-cols-4 items-center gap-2">
        <p className="text-sm text-neutral-300">Title</p>
        <Field
          className="col-span-3 font-mono text-xs"
          type="text"
          name="titleMapping"
          placeholder={`Example: Title`}
          inputSize="sm"
          as={NoAutoInput}
          disabled={isSubmitting}
        />
        <p className="text-sm text-neutral-300">Content</p>
        <Field
          className="col-span-3 font-mono text-xs"
          type="text"
          name="contentMapping"
          placeholder={`Example: ArticleBody`}
          inputSize="sm"
          as={NoAutoInput}
          disabled={isSubmitting}
        />
        <p className="text-sm text-neutral-300">Path</p>
        <Field
          className="col-span-3 font-mono text-xs"
          type="text"
          name="pathMapping"
          placeholder={`Example: UrlName`}
          inputSize="sm"
          as={NoAutoInput}
          disabled={isSubmitting}
        />
      </div>
      <div className="FormHeadingGroup">
        <p className="FormHeading">Metadata fields</p>
        <p className="FormSubheading">
          Specify custom fields to include in the file metadata
          (comma-separated).
        </p>
      </div>
      <Field
        className="h-[60px] flex-grow font-mono text-xs"
        type="text"
        name="metadataFields"
        placeholder={`Example: Id, Language`}
        textAreaSize="sm"
        as={NoAutoTextArea}
        disabled={isSubmitting}
      />
    </>
  );
};
