const ThinkingLoader = () => (
  <div className="flex items-center gap-1 px-4 py-3">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-primary animate-bounce"
        style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
      />
    ))}
  </div>
);

export default ThinkingLoader;
