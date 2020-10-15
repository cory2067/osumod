import React, { Component } from "react";
import { Router, Redirect } from "@reach/router";
import NotFound from "./pages/NotFound.js";
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
          <Navbar user={this.state.user} updateUser={this.updateUser} />
          <Router primary={false}>
            <Redirect from="/" to={`${DEFAULT_ID}/`} />
            <Redirect from="/archives" to={`${DEFAULT_ID}/archives`} />
            <Redirect from="/request" to={`${DEFAULT_ID}/request`} />

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
