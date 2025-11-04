import { PhotoUpload } from '../PhotoUpload';

export default function PhotoUploadExample() {
  return (
    <div className="p-8 bg-background">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl">
        <PhotoUpload label="Front View" />
        <PhotoUpload label="Back View" />
        <PhotoUpload label="Left Side" />
        <PhotoUpload label="Right Side" />
      </div>
    </div>
  );
}
