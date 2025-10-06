import React from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Users,
  TrendingUp,
  Shield,
  ArrowRight,
} from "lucide-react";
import { Button } from "../ui/button";
import PhantacciLogo from "../ui/phantacci-logo";
import playersCollage from "../../assets/4378f66421e2bbfb1528b43799a0713ac7be9be0.png";

const LandingPage: React.FC = () => {
  const features = [
    {
      icon: Trophy,
      title: "Competitive Leagues",
      description:
        "Create and join leagues with friends, colleagues, or compete globally.",
    },
    {
      icon: TrendingUp,
      title: "Real-time Tracking",
      description:
        "Track your performance with live updates and detailed analytics.",
    },
    {
      icon: Users,
      title: "Social Experience",
      description:
        "Connect with fellow fantasy football enthusiasts and share the excitement.",
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description:
        "Your data and transactions are protected with enterprise-level security.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${playersCollage})`,
            backgroundPosition: "center center",
            backgroundSize: "cover",
          }}
        >
          {/* Dark overlay to maintain readability */}
          <div className="absolute inset-0 bg-background/60"></div>
          {/* Gradient overlay for seamless blending */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/55 to-background/65"></div>
        </div>

        {/* Content */}
        <div className="container-clean text-center relative z-10">
          {/* Logo and Brand */}
          <div className="animate-fade-in mb-8">
            <div className="mx-auto w-fit text-left">
              <PhantacciLogo size="xl" variant="default" className="mx-0" />
            </div>
          </div>
          
          {/* Hero Title */}
          <div className="animate-fade-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Your Ultimate
              <span className="text-gradient block mt-2">
                Fantasy Football Hub
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create leagues, track performance, and compete with
              friends in the most comprehensive fantasy football
              platform.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="animate-fade-in flex flex-row flex-wrap gap-4 justify-center items-center">
            <Link to="/auth">
              <Button className="h-9 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90">
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="h-9 px-8 text-base border border-border bg-transparent hover:bg-accent hover:text-accent-foreground">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/50">
        <div className="container-clean">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Why Choose Phantacci?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your fantasy
              football leagues and compete at the highest level.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="clean-card text-center"
                >
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container-clean text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Start Playing?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of fantasy football managers already
            competing on Phantacci.
          </p>
          <Link to="/auth">
            <Button className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90">
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container-clean">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-medium mb-4">Explore</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">Features</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">Contact</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">Privacy</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">Terms</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">License</a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">Terms & Conditions</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 Phantacci. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

