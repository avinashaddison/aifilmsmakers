import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CreateFilm from "@/pages/create";
import StoryFramework from "@/pages/framework";
import Chapters from "@/pages/chapters";
import VideoGenerator from "@/pages/generator";
import Assembly from "@/pages/assembly";
import DownloadPage from "@/pages/download";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/create" component={CreateFilm} />
        <Route path="/framework" component={StoryFramework} />
        <Route path="/chapters" component={Chapters} />
        <Route path="/generator" component={VideoGenerator} />
        <Route path="/assembly" component={Assembly} />
        <Route path="/download" component={DownloadPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
