
import { Link } from "react-router-dom";

function PlaceholderPage({ title, description }) {
  return (
    <section className="content-card">
      <p className="eyebrow">APPOINTER</p>
      <h1>{title}</h1>
      <p className="description">{description}</p>

      <Link className="primary-button" to="/">
        Back to Home
      </Link>
    </section>
  );
}

export default PlaceholderPage;
