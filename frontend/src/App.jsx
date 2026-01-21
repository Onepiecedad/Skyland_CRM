import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Messages } from './pages/Messages';
import { CustomerList } from './pages/CustomerList';
import { CustomerDetail } from './pages/CustomerDetail';
import { JobList } from './pages/JobList';
import { JobDetail } from './pages/JobDetail';
import { JobCreate } from './pages/JobCreate';
import { LeadsPage } from './pages/LeadsPage';
import { Header } from './components/Header';

function App() {
    return (
        <div className="min-h-screen bg-background">
            <BrowserRouter>
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
                                <div className="min-h-screen bg-background flex flex-col">
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
                                <div className="min-h-screen bg-background flex flex-col">
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
                                <div className="min-h-screen bg-background flex flex-col">
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
                                <div className="min-h-screen bg-background flex flex-col">
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
                                <div className="min-h-screen bg-background flex flex-col">
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
                                <div className="min-h-screen bg-background flex flex-col">
                                    <Header />
                                    <JobDetail />
                                </div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </BrowserRouter>
            <Toaster />
        </div>
    );
}



export default App;
