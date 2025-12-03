export default function ReleaseDetailPage({ params }: { params: { id: string } }) {
    return (
      <div className="text-white p-6">
        <h1 className="text-2xl font-bold mb-4">Release Detail Page</h1>
        <p>Release ID: {params.id}</p>
      </div>
    );
  }
  