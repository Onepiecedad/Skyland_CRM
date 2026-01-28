import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FloatingActionButton } from './components/FloatingActionButton';
import { AiAssistant } from './components/AiAssistant';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Messages } from './pages/Messages';
import { CustomerList } from './pages/CustomerList';
import { CustomerDetail } from './pages/CustomerDetail';
import { JobList } from './pages/JobList';
import { JobDetail } from './pages/JobDetail';
import { JobCreate } from './pages/JobCreate';
import { LeadsPage } from './pages/LeadsPage';
import { Trash_ } from './pages/Trash';
import { Calendar_ } from './pages/Calendar';
import { Notes_ } from './pages/Notes';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';

// Wrapper component to conditionally show navigation elements
function AppContent() {
    const location = useLocation();
    const isLoginPage = location.pathname === '/login';

    return (
        <>
            <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Today />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/leads"
                    element={
                        <ProtectedRoute>
                            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                                <Header />
                                <main className="flex-1 container mx-auto px-4 py-6">
                                    <LeadsPage />
                                </main>
                            </div>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/meddelanden"
                    element={
                        <ProtectedRoute>
                            <Messages />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/kunder"
                    element={
                        <ProtectedRoute>
                            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                                <Header />
                                <CustomerList />
                            </div>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/kund/:id"
                    element={
                        <ProtectedRoute>
                            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                                <Header />
                                <CustomerDetail />
                            </div>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/jobb"
                    element={
                        <ProtectedRoute>
                            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                                <Header />
                                <JobList />
                            </div>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/jobb/nytt"
                    element={
                        <ProtectedRoute>
                            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                                <Header />
                                <JobCreate />
                            </div>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/jobb/:id"
                    element={
                        <ProtectedRoute>
                            <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
                                <Header />
                                <JobDetail />
                            </div>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/papperskorg"
                    element={
                        <ProtectedRoute>
                            <Trash_ />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/kalender"
                    element={
                        <ProtectedRoute>
                            <Calendar_ />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/anteckningar"
                    element={
                        <ProtectedRoute>
                            <Notes_ />
                        </ProtectedRoute>
                    }
                />
            </Routes>
            {/* Only show navigation components when NOT on login page */}
            {!isLoginPage && (
                <>
                    <BottomNav />
                    <AiAssistant />
                </>
            )}
        </>
    );
}

function App() {
    return (
        <div className="min-h-screen bg-background overflow-x-hidden">
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
            <Toaster />
        </div>
    );
}



export default App;
