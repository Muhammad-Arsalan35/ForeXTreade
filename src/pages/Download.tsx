import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Smartphone, Monitor, Globe, QrCode, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sample app information
const appInfo = {
  name: "Clover Path Rewards",
  version: "2.1.0",
  size: "45.2 MB",
  downloads: "10,000+",
  rating: 4.8,
  lastUpdated: "2025-01-15"
};

const platformDownloads = {
  android: {
    name: "Android App",
    description: "Download for Android devices (Android 7.0+)",
    icon: Smartphone,
    downloadUrl: "#",
    features: ["Push notifications", "Offline mode", "Biometric login", "Dark theme"]
  },
  ios: {
    name: "iOS App",
    description: "Download for iPhone and iPad (iOS 13.0+)",
    icon: Smartphone,
    downloadUrl: "#",
    features: ["Face ID support", "Apple Watch integration", "iCloud sync", "Siri shortcuts"]
  },
  web: {
    name: "Web App",
    description: "Access directly from your browser",
    icon: Globe,
    downloadUrl: "#",
    features: ["No installation", "Cross-platform", "Always up-to-date", "Responsive design"]
  },
  desktop: {
    name: "Desktop App",
    description: "Download for Windows, Mac, and Linux",
    icon: Monitor,
    downloadUrl: "#",
    features: ["Native performance", "System integration", "Keyboard shortcuts", "Multiple windows"]
  }
};

export const Download = () => {
  const [activeTab, setActiveTab] = useState("mobile");
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformDownloads | null>(null);
  const navigate = useNavigate();

  const handleDownload = (platform: string) => {
    // In a real app, this would trigger the actual download
    console.log(`Downloading for ${platform}`);
    // You can add actual download logic here
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: appInfo.name,
        text: `Check out ${appInfo.name} - a great rewards platform!`,
        url: window.location.origin
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.origin);
      // You could show a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-auto">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </Button>
        <h1 className="text-xl font-bold text-primary-foreground">Download App</h1>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* App Info Card */}
        <Card className="shadow-elegant">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 bg-gradient-golden rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Star className="w-10 h-10 text-primary-foreground" />
            </div>
            
            <h2 className="text-xl font-bold mb-2">{appInfo.name}</h2>
            <p className="text-muted-foreground mb-3">Version {appInfo.version}</p>
            
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-semibold">{appInfo.size}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Downloads</p>
                <p className="font-semibold">{appInfo.downloads}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Rating</p>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{appInfo.rating}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Last updated: {appInfo.lastUpdated}
            </p>
          </CardContent>
        </Card>

        {/* Download Options */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Download Options</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mobile">Mobile</TabsTrigger>
                <TabsTrigger value="desktop">Desktop</TabsTrigger>
              </TabsList>

              {/* Mobile Tab */}
              <TabsContent value="mobile" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedPlatform('android')}
                  >
                    <CardContent className="p-4 text-center">
                      <platformDownloads.android.icon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-sm mb-1">Android</h3>
                      <p className="text-xs text-muted-foreground">APK Download</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedPlatform('ios')}
                  >
                    <CardContent className="p-4 text-center">
                      <platformDownloads.ios.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-sm mb-1">iOS</h3>
                      <p className="text-xs text-muted-foreground">App Store</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Desktop Tab */}
              <TabsContent value="desktop" className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedPlatform('desktop')}
                  >
                    <CardContent className="p-4 text-center">
                      <platformDownloads.desktop.icon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-sm mb-1">Desktop</h3>
                      <p className="text-xs text-muted-foreground">Windows/Mac/Linux</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setSelectedPlatform('web')}
                  >
                    <CardContent className="p-4 text-center">
                      <platformDownloads.web.icon className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                      <h3 className="font-semibold text-sm mb-1">Web</h3>
                      <p className="text-xs text-muted-foreground">Browser Access</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Platform Detail */}
        {selectedPlatform && (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const IconComponent = platformDownloads[selectedPlatform].icon;
                  return <IconComponent className="w-6 h-6" />;
                })()}
                {platformDownloads[selectedPlatform].name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {platformDownloads[selectedPlatform].description}
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Features:</h4>
                <ul className="space-y-2">
                  {platformDownloads[selectedPlatform].features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => handleDownload(selectedPlatform)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button className="flex-1" variant="outline">
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code Section */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="w-32 h-32 bg-white mx-auto mb-4 rounded-lg flex items-center justify-center">
              <QrCode className="w-20 h-20 text-gray-400" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Scan this QR code with your mobile device to download the app
            </p>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share App
            </Button>
          </CardContent>
        </Card>

        {/* System Requirements */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>System Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Android</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Android 7.0+</li>
                  <li>• 2GB RAM</li>
                  <li>• 100MB storage</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">iOS</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• iOS 13.0+</li>
                  <li>• iPhone 6s+</li>
                  <li>• 100MB storage</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
