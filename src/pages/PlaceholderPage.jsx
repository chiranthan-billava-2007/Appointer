import { Link } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";

function PlaceholderPage({ title, description }) {
  return (
    <PublicLayout>
      <section className="page-hero" style={{ textAlign: "center" }}>
        <p className="eyebrow">APPOINTER</p>
        <h1>{title}</h1>
        <p style={{ margin: "0 auto 24px" }}>{description}</p>
        <Link className="primary-button" to="/">
          Back to Home
        </Link>
      </section>
    </PublicLayout>
  );
}

export default PlaceholderPage;
