export function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="pageStack">
      <header className="pageHeader"><h1>{title}</h1><p>This workspace is reserved for the next Trading Pi local capability layer.</p></header>
      <article className="emptyState">Phase architecture keeps this inside the single Trading Pi Agent runtime.</article>
    </section>
  );
}
