import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import FilePaste from "./FilePaste";

export default function Routing() {
    return (
        <Router>
            <div className="d-flex" style={{ height: "100vh" }}>
                <div className="bg-light border-end p-3" style={{ width: "150px" }}>
                  <h5>Menu</h5>
                  <ul className="nav flex-column">
                    <li className="nav-item">
                      <Link to="/minesweeper" className="nav-link">Probability calculator</Link>
                    </li>
                  </ul>
                </div>
                <div className="flex-grow-1 p-3">
                  <Routes>
                    <Route path="/minesweeper" element={<FilePaste />} />
                    <Route path="*" element={<div>404: Page Not Found</div>} />
                  </Routes>
                </div>
            </div>
        </Router>
    );
}