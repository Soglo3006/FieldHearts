export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] border-t">
      {/* Conversation list skeleton */}
      <div className="w-80 border-r shrink-0 p-3 space-y-2">
        <div className="h-10 bg-gray-200 rounded-lg animate-pulse mb-4" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b bg-white animate-pulse" />
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
              <div className="h-10 w-48 bg-gray-200 rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-16 border-t p-3">
          <div className="h-10 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
