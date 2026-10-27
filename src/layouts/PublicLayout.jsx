import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function PublicLayout({ children }) {
  return <div className="page-layout public-layout"><Navbar /><main className="page-main">{children}</main><Footer /></div>;
}

export default PublicLayout;
