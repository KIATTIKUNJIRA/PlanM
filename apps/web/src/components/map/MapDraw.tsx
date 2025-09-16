import dynamic from 'next/dynamic';
export default dynamic(() => import('./MapDrawInner'), {
  ssr: false,
  loading: () => <div className="h-96 rounded-md animate-pulse bg-gray-100" />,
});
