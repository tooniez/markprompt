import { useRouter } from 'next/router';

import { Editor } from '@/components/files/Editor';

const File = () => {
  const router = useRouter();
  const { fileId } = router.query;

  return <Editor fileId={parseInt(fileId as string)} />;
};

export default File;
