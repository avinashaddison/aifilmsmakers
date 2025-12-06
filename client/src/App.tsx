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
import TextToVideo from "@/pages/text-to-video";
import VideoLibrary from "@/pages/video-library";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/create" component={CreateFilm} />
        <Route path="/text-to-video" component={TextToVideo} />
        <Route path="/video-library" component={VideoLibrary} />
        <Route path="/framework/:filmId" component={StoryFramework} />
        <Route path="/chapters/:filmId" component={Chapters} />
        <Route path="/generator/:filmId" component={VideoGenerator} />
        <Route path="/assembly/:filmId" component={Assembly} />
        <Route path="/download/:filmId" component={DownloadPage} />
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
