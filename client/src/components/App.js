import React, { Component } from "react";
import { Router, Redirect } from "@reach/router";
import NotFound from "./pages/NotFound.js";
import Home from "./pages/Home.js";
import List from "./pages/List.js";
import Settings from "./pages/Settings.js";
import Request from "./pages/Request";
import Navbar from "./modules/Navbar";
import { get } from "../utilities";

import "../utilities.css";

import { Layout } from "antd";
import "antd/dist/antd.css";
const { Footer } = Layout;

const DEFAULT_ID = "Cychloryn";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { user: {}, loginAttention: false };

    // Redirect users off the herokuapp domain
    if (window.location.hostname === "osumod.herokuapp.com") {
      window.location.replace(window.location.href.replace("herokuapp.", ""));
    }
  }

  componentDidMount() {
    get("/api/whoami").then((res) => {
      this.setState({ user: res });
    });
  }

  updateUser = (user) => {
    this.setState({ user });
  };

  render() {
    return (
      <>
        <Layout>
          <Router>
            <Navbar path="/" user={this.state.user} updateUser={this.updateUser} home={true} />
            <Navbar path="/404" user={this.state.user} updateUser={this.updateUser} home={true} />
            <Navbar default user={this.state.user} updateUser={this.updateUser} home={false} />
          </Router>

          <Router primary={false}>
            <Redirect from="/archives" to={`${DEFAULT_ID}/archives`} />
            <Redirect from="/request" to={`${DEFAULT_ID}/request`} />

            <NotFound path="/404" />
            <Home path="/" user={this.state.user} />
            <List path="/:owner" user={this.state.user} archived={false} />
            <List path="/:owner/archives" user={this.state.user} archived={true} />
            <Request path="/:owner/request" user={this.state.user} />
            <Settings path="/:owner/settings" user={this.state.user} />
            <NotFound default />
          </Router>
          <Footer></Footer>
        </Layout>
      </>
    );
  }
}

export default App;
