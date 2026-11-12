import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import Dashboard from "./pages/dashboard";
import { Signin } from "./pages/Signin";
import { Signup } from "./pages/Signup";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SharedBrain } from "./pages/SharedBrain";
import { SharedLinks } from "./pages/SharedLinks";
import { GuestLogin } from "./pages/GuestLogin";
import { AuthCallback } from "./pages/AuthCallback";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to="/signin" replace />}
                />

                <Route
                    path="/signup"
                    element={<Signup />}
                />

                <Route
                    path="/signin"
                    element={<Signin />}
                />

                {/* Google/GitHub sign-in returns here with the token */}
                <Route
                    path="/auth/callback"
                    element={<AuthCallback />}
                />

                {/* One-click demo account, e.g. for a resume link */}
                <Route
                    path="/guest"
                    element={<GuestLogin />}
                />

                {/* Public shared Brain route */}
                <Route
                    path="/share/:hash"
                    element={<SharedBrain />}
                />

                {/* Public shared item or selection */}
                <Route
                    path="/s/:hash"
                    element={<SharedBrain variant="items" />}
                />

                {/* Protected application routes */}
                <Route element={<ProtectedRoute />}>
                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />
                    <Route
                        path="/shared-links"
                        element={<SharedLinks />}
                    />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;